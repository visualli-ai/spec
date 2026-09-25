import os

def on_config(config):
    version_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'VERSION')
    with open(version_file) as f:
        config['extra']['version'] = f.read().strip()
    return config
