using System;
using System.IO;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

class Program
{
    static void Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: dotnet run <jwtFile> <publicKeyFile>");
            return;
        }

        string jwtFile = args[0];
        string publicKeyFile = args[1];

        // Read the JWT
        string token;
        try
        {
            token = File.ReadAllText(jwtFile).Trim();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading JWT file: {ex.Message}");
            return;
        }

        // Read the public key
        string publicKeyPem;
        try
        {
            publicKeyPem = File.ReadAllText(publicKeyFile);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading public key file: {ex.Message}");
            return;
        }

        // Convert PEM to RSA public key
        var publicKey = PemToEcdsaSecurityKey(publicKeyPem);

        // Verify the JWT
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = false,
            IssuerSigningKey = publicKey
        };

        var handler = new JwtSecurityTokenHandler();
        // Decode JWT without verification
        try
        {
            var jwt = handler.ReadJwtToken(token);
            Console.WriteLine($"{jwt.Header.SerializeToJson()}");
            Console.WriteLine($"{PrettyPrintJson(jwt.Payload.SerializeToJson())}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error decoding JWT: {ex.Message}");
        }
        try
        {
            var claims = handler.ValidateToken(token, validationParameters, out _);
            Console.WriteLine("Verification Succeeded");
            // foreach (var claim in claims.Claims)
            // {
            //     Console.WriteLine($"{claim.Type}: {claim.Value}");
            // }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Verification Failed: {ex.Message}");
        }        
    }
    // Helper method to pretty print JSON
    private static string PrettyPrintJson(string json)
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = true, // Enable pretty printing
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping // Avoid escaping +
        };
        var jsonElement = JsonSerializer.Deserialize<JsonElement>(json);
        return JsonSerializer.Serialize(jsonElement, options);
    }
    // Helper method to convert PEM to ECDSA Security Key
    private static ECDsaSecurityKey PemToEcdsaSecurityKey(string pem)
    {
        var ecdsa = System.Security.Cryptography.ECDsa.Create();
        ecdsa.ImportFromPem(pem);
        return new ECDsaSecurityKey(ecdsa);
    }
}
