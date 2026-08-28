import json
import re
import os
import sys

def update_version():
    try:
        with open("VERSION", "r") as f:
            version = f.read().strip()
    except FileNotFoundError:
        print("Error: VERSION file not found.")
        sys.exit(1)

    print(f"Propagating version {version}...")

    # 1. Update visualli.schema.json
    schema_path = "visualli.schema.json"
    if os.path.exists(schema_path):
        with open(schema_path, "r") as f:
            schema = json.load(f)
        schema["title"] = f"Visualli Spec {version}"
        with open(schema_path, "w") as f:
            json.dump(schema, f, indent=2)
        print(f"Updated {schema_path}")

    # 2. Update bindings/python/setup.py
    setup_path = "bindings/python/setup.py"
    if os.path.exists(setup_path):
        with open(setup_path, "r") as f:
            content = f.read()
        content = re.sub(r'version="[^"]+"', f'version="{version}"', content)
        with open(setup_path, "w") as f:
            f.write(content)
        print(f"Updated {setup_path}")

    # 3. Update package.json files
    paths = [
        "bindings/typescript/package.json",
        "renderers/visualli-sdk/sdk/core/package.json",
        "renderers/visualli-sdk/sdk/react/package.json"
    ]
    for p in paths:
        if os.path.exists(p):
            with open(p, "r") as f:
                pkg = json.load(f)
            pkg["version"] = version
            with open(p, "w") as f:
                json.dump(pkg, f, indent=2)
            print(f"Updated {p}")

    # 4. Sync package-lock.json if needed
    sdk_root = "renderers/visualli-sdk"
    if os.path.exists(os.path.join(sdk_root, "package.json")):
        print(f"Syncing {sdk_root}/package-lock.json...")
        os.system(f"cd {sdk_root} && npm install --package-lock-only")

    ts_bindings_root = "bindings/typescript"
    if os.path.exists(os.path.join(ts_bindings_root, "package.json")):
        print(f"Syncing {ts_bindings_root}/package-lock.json...")
        os.system(f"cd {ts_bindings_root} && npm install --package-lock-only")

    # 5. Update README.md badge
    readme_path = "README.md"
    if os.path.exists(readme_path):
        with open(readme_path, "r") as f:
            readme = f.read()
        # Look for the version badge URL and update it
        pattern = r'src="https://img\.shields\.io/badge/Version-.+?-orange\?style=for-the-badge"'
        replacement = f'src="https://img.shields.io/badge/Version-{version}-orange?style=for-the-badge"'
        readme = re.sub(pattern, replacement, readme)
        with open(readme_path, "w") as f:
            f.write(readme)
        print(f"Updated {readme_path} badge")

if __name__ == "__main__":
    update_version()
