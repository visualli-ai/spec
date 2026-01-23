from setuptools import setup, find_packages

setup(
    name="visualli-models",
    version="0.1.0",
    description="Official Visualli Pydantic Models",
    py_modules=["visualli"],
    install_requires=[
        "pydantic>=2.0.0",
    ],
    python_requires=">=3.8",
)
