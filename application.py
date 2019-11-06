from flask import Flask, jsonify, session, request
from enum import Enum
from datetime import timedelta
import sqlite3, os

ADMIN_PASSWORD = "123456"

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)

@app.route('/', methods=['GET'])
def static_index():
    return app.send_static_file("index.html")
@app.route('/<path:filepath>', methods=['GET'])
def static_files(filepath):
    return app.send_static_file(filepath)

class Error(Enum):
    NotImplement = "NotImplement"
    DatabaseError = "DatabaseError"
    ClassNotFound = "ClassNotFound"
    PasswordError = "PasswordError"
    AuthenticationRequired = "AuthenticationRequired"

@app.route('/hello')
def hello_world():
    return 'Hello World'



@app.route('/admin_check', methods=['GET'])
def admin_check():
    admin = session.get("admin")
    if admin:
        return jsonify({
            "ok": "admin"
        })
    else:
        return jsonify({
            "error": Error.AuthenticationRequired.value
        })

@app.route('/admin_login', methods=['POST'])
def admin_login():
    print(request.form)
    password = request.form['password']
    session.permanent = True
    if password == ADMIN_PASSWORD:
        session['admin'] = True
        return jsonify({
            "ok": "login success"
        })
    else:
        session['admin'] = False
        return jsonify({
            "error": Error.PasswordError.value
        })

if __name__ == "__main__":
    # local test
    app.config['SECRET_KEY'] = b'T\xcfmx\x9b^$\xb0\xc9\xac\x99\xb1\x1eh\xc7\xa2\x1b.>k\xae\xb8$\xb2'
    app.debug = True
    app.run()
