from flask import Flask, jsonify, session, request
from enum import Enum
from datetime import timedelta
import sqlite3, os, json

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
    FrozenRequired = "FrozenRequired"
    DataTooLong = "DataTooLong"
    DataFormatError = "DataFormatError"
    CannotUnfreeze = "CannotUnfreeze"
    CidError = "CidError"

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
        return { "ok": "login success" }
    else:
        return { "error": Error.PasswordError.value }

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

def all_class_info():
    if not admin_check():
        return { "error": Error.AuthRequired.value }
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

def freeze_class(cid):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("UPDATE class set frozen = true where cid = %d" % cid)
    conn.commit()
    return {}
@app.route('/freeze_class', methods=['POST'])
def _freeze_class():
    cid = int(request.form['cid'])
    return jsonify(freeze_class(cid))
    
def unfreeze_class(cid):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("""UPDATE class set frozen = false WHERE cid = %d AND url != '' AND
        NOT EXISTS(SELECT * from class WHERE
            cid != %d AND frozen = false AND
            url IN (SELECT url FROM class WHERE cid = %d))""" % (cid, cid, cid))
    c.execute("SELECT frozen FROM class WHERE cid = %d" % cid)
    frozen = c.fetchone()[0]
    conn.commit()
    if frozen == 1:
        return { "error": Error.CannotUnfreeze.value }
    return {}
@app.route('/unfreeze_class', methods=['POST'])
def _unfreeze_class():
    cid = int(request.form['cid'])
    return jsonify(unfreeze_class(cid))

def modify_class(cid, url, note):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    if len(url) > 16 or len(note) > 65536:
        return { "error": Error.DataTooLong.value }
    if not url.encode("UTF-8").isalnum():
        return { "error": Error.DataFormatError.value }
    global conn
    c = conn.cursor()
    c.execute("UPDATE class set url = ? , note = ? WHERE cid = %d AND frozen = true" % (cid), (url, note))
    conn.commit()
    return {}
@app.route('/modify_class', methods=['POST'])
def _modify_class():
    cid = int(request.form['cid'])
    url = request.form['url']
    note = request.form['note']
    return jsonify(modify_class(cid, url, note))

def all_student_info(cid):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("SELECT student_info FROM class WHERE cid = %d" % cid)
    ret = c.fetchone()
    if ret is None:
        return { "error": Error.CidError.value }
    return json.loads(ret[0])
@app.route('/all_student_info/<int:cid>', methods=['GET'])
def _all_student_info(cid):
    return jsonify(all_student_info(cid))

def modify_student_info(cid, student_info):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("UPDATE class set student_info = ? WHERE cid = %d AND frozen = true" % (cid), (student_info,))
    conn.commit()
    return {}
@app.route('/modify_student_info', methods=['POST'])
def _modify_student_info():
    cid = int(request.form['cid'])
    student_info = request.form['student_info']
    json.loads(student_info)  # just to test Json format
    return jsonify(modify_student_info(cid, student_info))

#
# configuration
#

if __name__ == "__main__":
    # local test
    app.config['SECRET_KEY'] = b'T\xcfmx\x9b^$\xb0\xc9\xac\x99\xb1\x1eh\xc7\xa2\x1b.>k\xae\xb8$\xb2'
    app.debug = True
    conn = sqlite3.connect("./shuttlecock.db", check_same_thread=False)
else:  # production mode
    conn = sqlite3.connect("/home/admin/shuttlecock.db", check_same_thread=False)

conn.execute('''
CREATE TABLE IF NOT EXISTS class (
cid INTEGER PRIMARY KEY AUTOINCREMENT,
url VARCHAR(16) default '',
note NVARCHAR(64) default '',
frozen BOOLEAN default true,
student_info NVARCHAR(65536) default '[]',
create_time TIMESTAMP default (datetime('now', 'localtime'))
);
''')

if __name__ == "__main__":
    app.run()
