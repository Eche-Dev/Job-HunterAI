import json
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Pattern, Tuple
from urllib.parse import unquote

# =====================================================================
# GATEKEEPER WAF — Pure ASGI Middleware de Seguridad para Job Hunter
# =====================================================================

SQLI_PATTERNS: List[Pattern[str]] = [
    re.compile(r"(\bUNION\b\s+\bSELECT\b)", re.IGNORECASE),
    re.compile(r"(\bDROP\b\s+\bTABLE\b)", re.IGNORECASE),
    re.compile(r"(\bOR\b\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?)", re.IGNORECASE),
    re.compile(r"(--\s*$|;\s*--\s*)", re.IGNORECASE),
    re.compile(r"(\bSLEEP\s*\(\s*\d+\s*\)|\bBENCHMARK\s*\()", re.IGNORECASE),
]

XSS_PATTERNS: List[Pattern[str]] = [
    re.compile(r"<\s*script[^>]*>", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"\bon(error|load|mouseover|click|focus)\s*=", re.IGNORECASE),
    re.compile(r"<\s*iframe[^>]*>", re.IGNORECASE),
]

PATH_TRAVERSAL_PATTERNS: List[Pattern[str]] = [
    re.compile(r"(\.\./|\.\.\\){2,}", re.IGNORECASE),
    re.compile(r"(/etc/passwd|/etc/shadow|c:\\windows\\system32)", re.IGNORECASE),
]


class GatekeeperWAFState:
    """Almacena métricas y eventos de auditoría de Gatekeeper WAF en tiempo real."""

    def __init__(self) -> None:
        self.total_inspected: int = 0
        self.total_blocked: int = 0
        self.rate_limit_hits: int = 0
        self.recent_events: Deque[Dict[str, Any]] = deque(maxlen=100)
        self.ip_buckets: Dict[str, Deque[float]] = defaultdict(deque)

    def record_event(
        self,
        client_ip: str,
        path: str,
        method: str,
        rule_triggered: str,
        severity: str = "HIGH",
        details: str = "",
    ) -> None:
        self.total_blocked += 1
        event_dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "client_ip": client_ip,
            "method": method,
            "path": path,
            "rule_triggered": rule_triggered,
            "severity": severity,
            "details": details[:300],
        }
        self.recent_events.appendleft(event_dict)

        # Persistir permanentemente en Base de Datos (PostgreSQL en Railway / SQLite en local)
        try:
            from app.db.session import SessionLocal
            from app.models.job import WAFSecurityEvent

            db = SessionLocal()
            try:
                evt = WAFSecurityEvent(
                    client_ip=str(client_ip)[:80],
                    path=str(path)[:300],
                    method=str(method)[:20],
                    rule_triggered=str(rule_triggered)[:100],
                    severity=str(severity)[:40],
                    details=str(details)[:500],
                )
                db.add(evt)
                db.commit()
            finally:
                db.close()
        except Exception:
            pass

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.monotonic()
        bucket = self.ip_buckets[key]
        while bucket and (now - bucket[0]) > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_requests:
            self.rate_limit_hits += 1
            return False, len(bucket)
        bucket.append(now)
        return True, len(bucket)

    def get_summary(self) -> Dict[str, Any]:
        db_events: List[Dict[str, Any]] = []
        db_blocked_count = self.total_blocked

        try:
            from app.db.session import SessionLocal
            from app.models.job import WAFSecurityEvent

            db = SessionLocal()
            try:
                total_in_db = db.query(WAFSecurityEvent).count()
                db_blocked_count = max(self.total_blocked, total_in_db)
                records = (
                    db.query(WAFSecurityEvent)
                    .order_by(WAFSecurityEvent.id.desc())
                    .limit(50)
                    .all()
                )
                for r in records:
                    db_events.append(
                        {
                            "id": r.id,
                            "timestamp": r.timestamp.isoformat()
                            if r.timestamp
                            else datetime.now(timezone.utc).isoformat(),
                            "client_ip": r.client_ip,
                            "method": r.method,
                            "path": r.path,
                            "rule_triggered": r.rule_triggered,
                            "severity": r.severity,
                            "details": r.details or "",
                        }
                    )
            finally:
                db.close()
        except Exception:
            pass

        events_to_show = db_events if db_events else list(self.recent_events)[:50]

        return {
            "waf_name": "Gatekeeper WAF (Pure ASGI by Eche-Dev)",
            "version": "2.0.0",
            "status": "ACTIVE",
            "total_inspected_requests": self.total_inspected,
            "total_blocked_requests": db_blocked_count,
            "rate_limit_blocks": self.rate_limit_hits,
            "active_rules": [
                "OWASP-SQLi-Protection",
                "OWASP-XSS-Filter",
                "Path-Traversal-Shield",
                "BruteForce-Login-Limiter (10 req/min)",
                "SearchRun-Cost-Limiter (6 req/min)",
                "Strict-Security-Headers",
                "Persistent-Database-Audit-Log",
            ],
            "recent_events": events_to_show,
        }


waf_state = GatekeeperWAFState()


def inspect_text_for_attacks(raw_text: str) -> Tuple[bool, str]:
    decoded = unquote(raw_text)
    for pattern in SQLI_PATTERNS:
        if pattern.search(decoded):
            return True, "OWASP-SQLi-Detected"
    for pattern in XSS_PATTERNS:
        if pattern.search(decoded):
            return True, "OWASP-XSS-Detected"
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if pattern.search(decoded):
            return True, "Path-Traversal-Detected"
    return False, ""


class GatekeeperWAFMiddleware:
    """Middleware ASGI puro de alto rendimiento compatible con FastAPI y Starlette."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def _send_json_block(self, send: Any, status_code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"content-length", str(len(body)).encode("ascii")),
            (b"x-protected-by", b"Gatekeeper-WAF-2.0 (Eche-Dev)"),
            (b"x-content-type-options", b"nosniff"),
            (b"x-frame-options", b"DENY"),
        ]
        await send({"type": "http.response.start", "status": status_code, "headers": headers})
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope: Dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        waf_state.total_inspected += 1
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        path = scope.get("path", "")
        raw_query = scope.get("query_string", b"").decode("latin-1")
        method = scope.get("method", "GET")

        # 1. Rate Limiting diferenciado
        if path.endswith("/auth/login"):
            allowed, _ = waf_state.check_rate_limit(f"{client_ip}:login", max_requests=10, window_seconds=60)
            if not allowed:
                waf_state.record_event(
                    client_ip, path, method, "BruteForce-Login-RateLimit", "HIGH", "Exceso de intentos de login"
                )
                await self._send_json_block(
                    send,
                    429,
                    {
                        "error": "Gatekeeper WAF: Demasiados intentos de inicio de sesión. Espera 1 minuto.",
                        "waf_rule": "BruteForce-Login-RateLimit",
                    },
                )
                return
        elif "/admin/search-runs" in path and method == "POST":
            allowed, _ = waf_state.check_rate_limit(f"{client_ip}:search_run", max_requests=6, window_seconds=60)
            if not allowed:
                waf_state.record_event(
                    client_ip,
                    path,
                    method,
                    "SearchRun-Cost-RateLimit",
                    "MEDIUM",
                    "Protección de presupuesto contra ejecuciones masivas",
                )
                await self._send_json_block(
                    send,
                    429,
                    {
                        "error": "Gatekeeper WAF: Límite de ejecuciones manuales por minuto alcanzado.",
                        "waf_rule": "SearchRun-Cost-RateLimit",
                    },
                )
                return
        else:
            allowed, _ = waf_state.check_rate_limit(f"{client_ip}:general", max_requests=180, window_seconds=60)
            if not allowed:
                waf_state.record_event(client_ip, path, method, "Global-RateLimit", "MEDIUM", "Tráfico excesivo")
                await self._send_json_block(
                    send,
                    429,
                    {"error": "Gatekeeper WAF: Rate limit excedido.", "waf_rule": "Global-RateLimit"},
                )
                return

        # 2. Inspección OWASP de Path y Query String
        is_malicious, rule_name = inspect_text_for_attacks(f"{path}?{raw_query}")
        if is_malicious:
            waf_state.record_event(client_ip, path, method, rule_name, "CRITICAL", f"Query/Path: {raw_query}")
            await self._send_json_block(
                send,
                403,
                {
                    "error": f"Bloqueado por Gatekeeper WAF ({rule_name})",
                    "waf_rule": rule_name,
                },
            )
            return

        # 3. Inyección de cabeceras de seguridad en la respuesta
        async def send_with_security_headers(message: Dict[str, Any]) -> None:
            if message.get("type") == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(
                    [
                        (b"x-xss-protection", b"1; mode=block"),
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"referrer-policy", b"strict-origin-when-cross-origin"),
                        (b"x-protected-by", b"Gatekeeper-WAF-2.0 (Eche-Dev)"),
                    ]
                )
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
