from flask import Flask
import sqlite3

app = Flask(__name__)

@app.route('/', methods=['GET'])
def static_index():
    return app.send_static_file("index.html")
@app.route('/<path:filepath>', methods=['GET'])
def static_files(filepath):
    return app.send_static_file(filepath)

@app.route('/hello')
def hello_world():
    return 'HHHHHH'

if __name__ == "__main__":
    # local test
    app.debug = True
    app.run()
