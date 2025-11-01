using System;
using System.Text.Json;
using WASimCommander.CLI.Client;
using WASimCommander.CLI.Enums;

namespace WasimBridge
{
    class Program
    {
        private static WASimClient? client;
        private static bool running = true;

        static async Task Main(string[] args)
        {
            try
            {
                // Initialize WASimCommander client with logging disabled
                client = new WASimClient(12345); // Client ID must be > 0

                // Disable console logging from WASimClient
                client.setLogLevel(LogLevel.None, LogFacility.Console, LogSource.Client);
                client.setLogLevel(LogLevel.None, LogFacility.Remote, LogSource.Client);

                // Connect to MSFS/WASimModule
                var result = client.connectSimulator();
                if ((int)result != 0)
                {
                    WriteOutput(new { error = true, message = $"Failed to connect to simulator: {result}" });
                    return;
                }

                result = client.connectServer();
                if ((int)result != 0)
                {
                    WriteOutput(new { error = true, message = $"Failed to connect to WASimModule: {result}" });
                    return;
                }

                WriteOutput(new { ready = true, message = "WASimCommander bridge ready" });

                // Listen for commands on stdin
                await ListenForCommands();
            }
            catch (Exception ex)
            {
                WriteOutput(new { error = true, message = ex.Message });
            }
            finally
            {
                client?.Dispose();
            }
        }

        static async Task ListenForCommands()
        {
            while (running)
            {
                var line = await Console.In.ReadLineAsync();
                if (line == null)
                {
                    running = false;
                    break;
                }

                try
                {
                    var command = JsonSerializer.Deserialize<JsonElement>(line);

                    if (command.TryGetProperty("type", out var type))
                    {
                        var typeStr = type.GetString();

                        switch (typeStr)
                        {
                            case "event":
                                HandleEvent(command);
                                break;
                            case "ping":
                                WriteOutput(new { type = "pong" });
                                break;
                            case "exit":
                                running = false;
                                break;
                            default:
                                WriteOutput(new { error = true, message = $"Unknown command type: {typeStr}" });
                                break;
                        }
                    }
                }
                catch (Exception ex)
                {
                    WriteOutput(new { error = true, message = ex.Message });
                }
            }
        }

        static void HandleEvent(JsonElement command)
        {
            if (!command.TryGetProperty("event", out var eventName))
            {
                WriteOutput(new { error = true, message = "Missing 'event' property" });
                return;
            }

            var eventStr = eventName.GetString();
            if (string.IsNullOrEmpty(eventStr))
            {
                WriteOutput(new { error = true, message = "Event name is empty" });
                return;
            }

            // Send H-event via WASimCommander using RPN calculator code
            double resultValue = 0;
            var hr = client?.executeCalculatorCode($"(>H:{eventStr})", CalcResultType.None, out resultValue);

            if (hr == null || (int)hr != 0)
            {
                var errorMsg = $"Failed to send event: HR={hr}";
                WriteOutput(new { error = true, eventName = eventStr, message = errorMsg });
            }
            else
            {
                WriteOutput(new { success = true, eventName = eventStr });
            }
        }

        static void WriteOutput(object data)
        {
            var json = JsonSerializer.Serialize(data);
            Console.WriteLine(json);
            Console.Out.Flush();
        }
    }
}
