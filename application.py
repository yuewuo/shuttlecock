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
    AuthRequired = "AuthRequired"

@app.route('/hello')
def hello_world():
    return 'Hello World'

#
# Private APIs
#

#
# Public APIs
#

def admin_check():
    return session.get("admin") == True
@app.route('/admin_check', methods=['GET'])
def _admin_check():
    if admin_check():
        return jsonify({ "ok": "admin" })
    else:
        return jsonify({ "error": Error.AuthRequired.value })

def admin_login(password):
    session.permanent = True
    ret = session['admin'] = (password == ADMIN_PASSWORD)
    return ret
@app.route('/admin_login', methods=['POST'])
def _admin_login():
    password = request.form['password']
    if admin_login(password):
        return jsonify({ "ok": "login success" })
    else:
        return jsonify({ "error": Error.PasswordError.value })

def new_class():
    global conn
    c = conn.cursor()
    c.execute("INSERT INTO class (url) VALUES ('')")
    c.execute("SELECT last_insert_rowid() from class")
    ret = c.fetchone()[0]
    conn.commit()
    return ret
@app.route('/new_class', methods=['POST'])
def _new_class():
    return jsonify({ "cid": new_class() })

if __name__ == "__main__":
    # local test
    app.config['SECRET_KEY'] = b'T\xcfmx\x9b^$\xb0\xc9\xac\x99\xb1\x1eh\xc7\xa2\x1b.>k\xae\xb8$\xb2'
    app.debug = True
    conn = sqlite3.connect("./shuttlecock.db", check_same_thread=False)
else:  # production mode
    conn = sqlite3.connect("~/shuttlecock.db", check_same_thread=False)

def all_class_info():
    global conn
    c = conn.cursor()
    c.execute("SELECT cid, url, note, frozen, create_time from class")
    classes = []
    for row in c:
        classes.append({
            "cid": row[0],
            "url": row[1],
            "note": row[2],
            "frozen": row[3],
            "create_time": row[4],
        })
    return classes
@app.route('/all_class_info', methods=['GET'])
def _all_class_info():
    return jsonify(all_class_info())

conn.execute('''
CREATE TABLE IF NOT EXISTS class (
cid INTEGER PRIMARY KEY AUTOINCREMENT,
url VARCHAR(16) default '',
note NVARCHAR(64) default '',
frozen BOOLEAN default true,
student_info NVARCHAR(65536) default '{}',
create_time TIMESTAMP default (datetime('now', 'localtime'))
);
''')

if __name__ == "__main__":
    app.run()
