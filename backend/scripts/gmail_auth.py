import os
from google_auth_oauthlib.flow import InstalledAppFlow

# Permiso estricto de SOLO LECTURA
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def main():
    # Rutas absolutas a los archivos
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cred_path = os.path.join(base_dir, 'credentials', 'gmail_credentials.json')
    token_path = os.path.join(base_dir, 'credentials', 'gmail_token.json')

    if not os.path.exists(cred_path):
        print(f"❌ ERROR: No se encontró {cred_path}")
        print("Por favor revisá que descargaste el JSON de Google y lo guardaste en esa ruta exacta.")
        return

    print("🚀 Iniciando el flujo de autorización con Google...")
    # Creamos el flujo a partir de tu archivo client_secret
    flow = InstalledAppFlow.from_client_secrets_file(cred_path, SCOPES)
    
    # Esto levantará un mini-servidor web y abrirá Chrome/Firefox automáticamente
    creds = flow.run_local_server(port=0)

    # Grabamos el token_json definitivo
    with open(token_path, 'w') as token:
        token.write(creds.to_json())

    print(f"\n✅ ¡ÉXITO! Token generado y guardado en {token_path}")
    print("El backend ya tiene acceso de lectura a Gmail. ¡Podés continuar!")

if __name__ == '__main__':
    main()
