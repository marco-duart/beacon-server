# Integrating a system with Beacon

This guide is for engineers who want to make **their own application** report errors to a Beacon instance. It covers the HTTP contract every SDK talks to, and gives a minimal, dependency-light reference implementation in Node.js/TypeScript, Ruby, Python and Java. None of this is a published package — copy, trim and adapt the snippet that matches your stack.

## 1. Get a system and an API key

In the Beacon dashboard, create a "system" for your application (`Systems → New system`). You'll get back an API key that looks like `bcn_live_9f3a1c2d...`. **It is shown once** — store it as a secret (env var, secrets manager), never in source control.

The key alone identifies which system an event belongs to — you never send a system name/id in the payload.

## 2. The HTTP contract

```
POST {BEACON_URL}/events
Header:  X-Beacon-Key: <your system's API key>
Header:  Content-Type: application/json
```

Body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | yes | Exception/error class name, e.g. `TypeError`, `NullPointerException`. Used for grouping. |
| `message` | string | yes | Human-readable error message. |
| `level` | `"fatal" \| "error" \| "warning" \| "info"` | yes | Severity. |
| `stacktrace` | string \| array of objects | no | Raw stack text, or structured frames — either is fine. |
| `environment` | string | no | e.g. `production`, `staging`. |
| `release` | string | no | Your app's version/commit, e.g. `1.4.2` or a git SHA. |
| `tags` | `Record<string, string>` | no | Small, indexable key/value pairs (e.g. `{"region":"eu-west-1"}`). |
| `extra` | `Record<string, unknown>` | no | Anything else useful for debugging (request body, user id, ...). Avoid secrets/PII. |
| `timestamp` | ISO 8601 string | no | When the error happened; defaults to receipt time. |

Response: `202 Accepted` with `{"status":"queued"}` — the event was buffered, not yet processed. Beacon groups events into "issues" by a fingerprint of `type + message + top stack frames`, so the exact same bug reported repeatedly increments one issue's counter instead of creating duplicates.

`401 Unauthorized` means the `X-Beacon-Key` header is missing or invalid — check the key wasn't rotated in the dashboard.

## 3. Ground rules for any SDK you write

1. **Never let error reporting break the app.** Wrap the HTTP call in try/catch, swallow failures (maybe log at debug level), and never throw from inside your reporter.
2. **Never block the main thread/event loop.** Fire the HTTP request asynchronously (or from a background thread/worker).
3. **Set a short timeout** (1–3s) on the HTTP client so a slow/unreachable Beacon instance can't pile up requests.
4. **Batch when you can.** If you expect bursts (e.g. a crash loop), queue events in memory and flush in small batches instead of one request per error, so you don't hammer the API.
5. **Sample high-volume errors.** If the same error can fire thousands of times per minute, cap how many you actually send (Beacon already dedupes by fingerprint, but you still save bandwidth by not sending all of them).
6. **Always set `type` and `message` meaningfully** — they drive grouping. Avoid putting request-specific data (ids, timestamps) inside `message`; put that in `extra` or `tags` instead, or grouping will fragment.
7. **Register both sync and async unhandled-error hooks** (uncaught exceptions *and* unhandled promise/future rejections) — most real outages come from the async path.

## 4. Node.js / TypeScript

```ts
// beacon-client.ts
interface BeaconOptions {
  url: string;
  apiKey: string;
  environment?: string;
  release?: string;
}

export class BeaconClient {
  constructor(private readonly options: BeaconOptions) {}

  captureException(error: unknown, extra?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error));
    void this.send({
      type: err.name || 'Error',
      message: err.message,
      level: 'error',
      stacktrace: err.stack,
      environment: this.options.environment,
      release: this.options.release,
      extra,
    });
  }

  private async send(payload: Record<string, unknown>): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      await fetch(`${this.options.url}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Beacon-Key': this.options.apiKey },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {
      // Reporting must never crash the app it's reporting from.
    }
  }
}

// Wire it up once, at process start:
const beacon = new BeaconClient({
  url: process.env.BEACON_URL!,
  apiKey: process.env.BEACON_API_KEY!,
  environment: process.env.NODE_ENV,
});

process.on('uncaughtException', (error) => beacon.captureException(error));
process.on('unhandledRejection', (reason) => beacon.captureException(reason));
```

Express error middleware example:

```ts
app.use((err: unknown, req: Request, _res: Response, next: NextFunction) => {
  beacon.captureException(err, { path: req.path, method: req.method });
  next(err);
});
```

## 5. Ruby

```ruby
# beacon_client.rb
require 'net/http'
require 'json'
require 'uri'

class BeaconClient
  def initialize(url:, api_key:, environment: nil, release: nil)
    @uri = URI.join(url, '/events')
    @api_key = api_key
    @environment = environment
    @release = release
  end

  def capture_exception(exception, extra: {})
    send_event(
      type: exception.class.name,
      message: exception.message,
      level: 'error',
      stacktrace: exception.backtrace&.join("\n"),
      environment: @environment,
      release: @release,
      extra: extra
    )
  end

  private

  def send_event(payload)
    Thread.new do
      begin
        http = Net::HTTP.new(@uri.host, @uri.port)
        http.use_ssl = @uri.scheme == 'https'
        http.open_timeout = 2
        http.read_timeout = 2

        request = Net::HTTP::Post.new(@uri.request_uri)
        request['Content-Type'] = 'application/json'
        request['X-Beacon-Key'] = @api_key
        request.body = payload.compact.to_json

        http.request(request)
      rescue StandardError
        # Never let reporting take the process down with it.
      end
    end
  end
end
```

Rails initializer (`config/initializers/beacon.rb`):

```ruby
BEACON = BeaconClient.new(
  url: ENV.fetch('BEACON_URL'),
  api_key: ENV.fetch('BEACON_API_KEY'),
  environment: Rails.env
)

Rails.application.config.middleware.use(
  Class.new do
    def initialize(app) = @app = app
    def call(env)
      @app.call(env)
    rescue StandardError => e
      BEACON.capture_exception(e, extra: { path: env['PATH_INFO'] })
      raise
    end
  end
)
```

## 6. Python

```python
# beacon_client.py
import json
import sys
import threading
import traceback
import urllib.request

class BeaconClient:
    def __init__(self, url, api_key, environment=None, release=None):
        self.endpoint = url.rstrip("/") + "/events"
        self.api_key = api_key
        self.environment = environment
        self.release = release

    def capture_exception(self, exc, extra=None):
        payload = {
            "type": type(exc).__name__,
            "message": str(exc),
            "level": "error",
            "stacktrace": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
            "environment": self.environment,
            "release": self.release,
            "extra": extra or {},
        }
        threading.Thread(target=self._send, args=(payload,), daemon=True).start()

    def _send(self, payload):
        try:
            body = json.dumps({k: v for k, v in payload.items() if v is not None}).encode()
            request = urllib.request.Request(
                self.endpoint,
                data=body,
                headers={"Content-Type": "application/json", "X-Beacon-Key": self.api_key},
                method="POST",
            )
            urllib.request.urlopen(request, timeout=2)
        except Exception:
            pass  # reporting must never raise


beacon = BeaconClient(
    url="https://beacon.internal",
    api_key="bcn_live_...",
)

def _excepthook(exc_type, exc_value, exc_tb):
    beacon.capture_exception(exc_value)
    sys.__excepthook__(exc_type, exc_value, exc_tb)

sys.excepthook = _excepthook
```

Flask error handler:

```python
@app.errorhandler(Exception)
def handle_exception(e):
    beacon.capture_exception(e, extra={"path": request.path})
    raise e
```

## 7. Java

```java
// BeaconClient.java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;
import java.io.PrintWriter;
import java.io.StringWriter;

public class BeaconClient {
    private final String url;
    private final String apiKey;
    private final String environment;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .executor(Executors.newVirtualThreadPerTaskExecutor())
            .build();

    public BeaconClient(String url, String apiKey, String environment) {
        this.url = url;
        this.apiKey = apiKey;
        this.environment = environment;
    }

    public void captureException(Throwable error, Map<String, Object> extra) {
        StringWriter stack = new StringWriter();
        error.printStackTrace(new PrintWriter(stack));

        String body = """
                {"type":"%s","message":"%s","level":"error","stacktrace":%s,"environment":"%s"}
                """.formatted(
                error.getClass().getSimpleName(),
                escape(error.getMessage()),
                toJsonString(stack.toString()),
                environment);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url + "/events"))
                .timeout(Duration.ofSeconds(2))
                .header("Content-Type", "application/json")
                .header("X-Beacon-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        http.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                .exceptionally(ignored -> null); // never propagate reporting failures
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("\"", "\\\"");
    }

    private static String toJsonString(String value) {
        return "\"" + escape(value) + "\"";
    }
}
```

Register a default uncaught-exception handler at startup:

```java
Thread.setDefaultUncaughtExceptionHandler((thread, error) ->
    beacon.captureException(error, Map.of("thread", thread.getName())));
```

Spring `@ControllerAdvice` example:

```java
@RestControllerAdvice
public class BeaconExceptionHandler {
    private final BeaconClient beacon;

    public BeaconExceptionHandler(BeaconClient beacon) {
        this.beacon = beacon;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handle(Exception ex, HttpServletRequest request) {
        beacon.captureException(ex, Map.of("path", request.getRequestURI()));
        return ResponseEntity.status(500).body("Internal error");
    }
}
```

> The Java/Ruby/Python snippets above use only their standard libraries on purpose, so they compile-and-go without adding a new dependency just to report errors. Swap in your preferred HTTP client if you already have one in the project.
