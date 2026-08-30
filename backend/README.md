create virtual environment venv 
use venv
pip install -r requirements.txt
uvicorn app.main:app -- reload
