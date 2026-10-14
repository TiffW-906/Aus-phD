"""Private Site service read/write. Credentials enter through hidden stdin only."""
import json
import sys
import urllib.request
import urllib.error
from urllib.parse import urlparse

if sys.stdin.isatty():
    import termios
    settings = termios.tcgetattr(sys.stdin.fileno())
    settings[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, settings)
print("Ready for official update JSON (input hidden).", flush=True)
args = json.loads(sys.stdin.readline())
url = args["url"].rstrip("/")
parsed = urlparse(url)
if parsed.scheme != "https" or not parsed.hostname.endswith(".chatgpt.site") or parsed.username or parsed.query:
    raise ValueError("A verified HTTPS Sites URL is required")
action = args.get("action", "GET")
if action not in ("GET", "PUT"):
    raise ValueError("Only official-data GET and PUT are supported")
payload = None if action == "GET" else json.dumps({"revision": args["revision"], "data": args["data"]}).encode()
request = urllib.request.Request(url + "/api/official", data=payload, method=action, headers={
    "OAI-Sites-Authorization": "Bearer " + args["token"], "Content-Type": "application/json"
})
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

try:
    with urllib.request.build_opener(NoRedirect).open(request, timeout=45) as response:
        print(json.dumps({"status": response.status, "body": json.loads(response.read())}, ensure_ascii=False))
except urllib.error.HTTPError as error:
    print(json.dumps({"status": error.code, "error": error.read().decode(errors="replace")}, ensure_ascii=False))
    sys.exit(1)
