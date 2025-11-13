using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Producer;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Hardcoded fallback (demo only � do NOT use in production repos)
const string FallbackConnectionString = "Endpoint=sb://<SOME GUID>.servicebus.windows.net/;SharedAccessKeyName=<SOME GUID>;SharedAccessKey=<XXXXXX>k=;EntityPath=<es_SOME GUID In the Event Hub Name>";
const string FallbackHubName = "<es_SOME GUID In the Event Hub Name>"; // Only used if EntityPath not in connection string

// Read environment variables first (support both double underscore mapping and flat names)
string? envConn = Environment.GetEnvironmentVariable("EVENTHUB__CONNECTIONSTRING");
string? envName = Environment.GetEnvironmentVariable("EVENTHUB__NAME");

var effectiveConnectionString = string.IsNullOrWhiteSpace(envConn) ? FallbackConnectionString : envConn;
var effectiveHubName = string.IsNullOrWhiteSpace(envName) ? FallbackHubName : envName;

builder.Services.AddSingleton(sp =>
{
    try
    {
        // If connection string already embeds EntityPath, use single-arg constructor
        if (effectiveConnectionString.Contains("EntityPath=", StringComparison.OrdinalIgnoreCase))
            return new EventHubProducerClient(effectiveConnectionString);
        // Otherwise supply hub name separately
        return new EventHubProducerClient(effectiveConnectionString, effectiveHubName);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR initializing EventHubProducerClient: {ex.Message}");
        return null!;
    }
});

builder.Services.AddSingleton<EventHubService>();

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/config-status", (EventHubService svc) => Results.Ok(new {
    hardCodedFallbackUsed = envConn is null,
    producerReady = svc.IsReady,
    entityPathEmbedded = effectiveConnectionString.Contains("EntityPath=", StringComparison.OrdinalIgnoreCase),
    connectionStringSource = envConn is null ? "fallback" : "environment",
    hubNameUsed = effectiveHubName
}));

app.MapPost("/api/telemetry", async (TelemetryEvent telemetry, EventHubService svc) =>
{
    if (string.IsNullOrWhiteSpace(telemetry.UserName)) return Results.BadRequest("userName required");
    if (!svc.IsReady) return Results.StatusCode(503);

    telemetry.ServerTimestamp = DateTime.UtcNow;
    try
    {
        await svc.SendAsync(telemetry);
        return Results.Accepted();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR sending telemetry: {ex.Message}");
        return Results.Problem("Send failed", statusCode: 500);
    }
});

app.MapPost("/api/telemetry-custom", async (CustomTelemetryRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.ConnectionString))
        return Results.BadRequest("connectionString required");

    // If telemetry is null, just validate the connection string
    if (request.Telemetry == null)
    {
        try
        {
            // Test creating a producer client with the provided connection string
            await using var testProducer = request.ConnectionString.Contains("EntityPath=", StringComparison.OrdinalIgnoreCase)
                ? new EventHubProducerClient(request.ConnectionString)
                : throw new ArgumentException("Connection string must include EntityPath");

            // Verify we can get properties (this validates the connection)
            var props = await testProducer.GetEventHubPropertiesAsync();
            Console.WriteLine($"Validated custom connection to hub: {props.Name}");
            return Results.Ok(new { validated = true, hubName = props.Name });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR validating connection string: {ex.Message}");
            return Results.BadRequest($"Invalid connection string: {ex.Message}");
        }
    }

    // Send telemetry using the custom connection string
    var telemetry = request.Telemetry;
    if (string.IsNullOrWhiteSpace(telemetry.UserName)) 
        return Results.BadRequest("userName required");

    telemetry.ServerTimestamp = DateTime.UtcNow;
    try
    {
        await using var producer = request.ConnectionString.Contains("EntityPath=", StringComparison.OrdinalIgnoreCase)
            ? new EventHubProducerClient(request.ConnectionString)
            : throw new ArgumentException("Connection string must include EntityPath");

        var json = JsonSerializer.Serialize(telemetry, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var data = new EventData(Encoding.UTF8.GetBytes(json));
        using var batch = await producer.CreateBatchAsync();
        if (!batch.TryAdd(data))
        {
            await producer.SendAsync(new[] { data });
        }
        else
        {
            await producer.SendAsync(batch);
        }
        return Results.Accepted();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR sending telemetry with custom connection: {ex.Message}");
        return Results.Problem($"Send failed: {ex.Message}", statusCode: 500);
    }
});

app.Run();

// Models
public record CustomTelemetryRequest(string ConnectionString, TelemetryEvent? Telemetry);
public record TelemetryEvent(
    DateTime Timestamp,
    string UserName,
    string EventType,
    AccelData Acceleration,
    AccelData DeltaAcceleration,
    string ShakeIntensity)
{
    public DateTime ServerTimestamp { get; set; }
    public float AccelerationValue => (float)Acceleration.Magnitude;
    public float DeltaAccelerationValue => (float)DeltaAcceleration.Magnitude;
}
public record AccelData(double X, double Y, double Z, double Magnitude);

public class EventHubService
{
    private readonly EventHubProducerClient _producer;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public bool IsReady => _producer != null;

    public EventHubService(EventHubProducerClient producer)
    {
        _producer = producer;
    }

    public async Task SendAsync(object payload)
    {
        if (_producer == null) throw new InvalidOperationException("Producer not initialized.");
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var data = new EventData(Encoding.UTF8.GetBytes(json));
        using var batch = await _producer.CreateBatchAsync();
        if (!batch.TryAdd(data))
        {
            await _producer.SendAsync(new[] { data });
            return;
        }
        await _producer.SendAsync(batch);
    }
}
