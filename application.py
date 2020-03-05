from flask import Flask, jsonify, session, request, Response
from enum import Enum
from datetime import timedelta
import sqlite3, os, json, time, datetime, re
import keys

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)

@app.route('/', methods=['GET'])
def static_index():
    return app.send_static_file("index.html")
@app.route('/<path:filepath>', methods=['GET'])
def static_files(filepath):
    return app.send_static_file(filepath)
@app.route('/<classname>.', methods=['GET'])
def class_files(classname):
    return app.send_static_file("template.html")

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
    ERROR_FORMAT = "ERROR:FORMAT"
    ERROR_NAME = "ERROR:NAME"
    ERROR_DATE = "ERROR:DATE"

@app.route('/hello')
def hello_world():
    return 'Hello World'

#
# Private APIs
#

def query_cid_by_url(url):
    global conn
    c = conn.cursor()
    c.execute("SELECT cid FROM class WHERE frozen = 0 AND url = ?", (url,))
    ret = c.fetchone()
    if ret is None:
        return None
    return int(ret[0])

def get_composed(cid):
    global conn
    c = conn.cursor()
    c.execute("SELECT name, time, value FROM record WHERE cid = %d ORDER BY rid ASC" % cid)
    composed = {}
    for row in c:
        name = row[0]
        this_time = time.strptime(row[1], '%Y-%m-%d %H:%M:%S')
        value = row[2]
        if name in composed:
            found_same_day = False
            person = composed[name]
            for key in person:
                if time.strftime("%Y-%m-%d", this_time) == time.strftime("%Y-%m-%d", key):
                    found_same_day = True
                    if time.mktime(this_time) >= time.mktime(key):  # later value override
                        del composed[name][key]
                        composed[name][this_time] = value
                    break
            if not found_same_day:  # not this value
                composed[name][this_time] = value
        else:
            composed[name] = { this_time : value }
    return composed

def get_student_info(cid):
    global conn
    c = conn.cursor()
    c.execute("SELECT student_info FROM class WHERE cid = %d" % cid)
    ret = c.fetchone()
    if ret is None:
        return None
    return json.loads(ret[0])

def get_student_names(cid):
    info = get_student_info(cid)
    if info is None:
        return None
    return [e["n"] for e in info]

#
# Public APIs
#

def admin_check():
    return session.get("admin") == True
@app.route('/api/admin_check', methods=['GET'])
def _admin_check():
    if admin_check():
        return jsonify({ "ok": "admin" })
    else:
        return jsonify({ "error": Error.AuthRequired.value })

def admin_login(password):
    session.permanent = True
    ret = session['admin'] = (password == keys.ADMIN_PASSWORD)
    return ret
@app.route('/api/admin_login', methods=['POST'])
def _admin_login():
    password = request.form['password']
    if admin_login(password):
        return jsonify({ "ok": "login success" })
    else:
        return jsonify({ "error": Error.PasswordError.value })

def new_class():
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("INSERT INTO class (url) VALUES ('')")
    c.execute("SELECT last_insert_rowid() from class")
    ret = c.fetchone()[0]
    conn.commit()
    return ret
@app.route('/api/new_class', methods=['POST'])
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
@app.route('/api/all_class_info', methods=['GET'])
def _all_class_info():
    return jsonify(all_class_info())

def freeze_class(cid):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("UPDATE class set frozen = 1 where cid = %d" % cid)
    conn.commit()
    return {}
@app.route('/api/freeze_class', methods=['POST'])
def _freeze_class():
    cid = int(request.form['cid'])
    return jsonify(freeze_class(cid))
    
def unfreeze_class(cid):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("""UPDATE class set frozen = 0 WHERE cid = %d AND url != '' AND
        NOT EXISTS(SELECT * from class WHERE
            cid != %d AND frozen = 0 AND
            url IN (SELECT url FROM class WHERE cid = %d))""" % (cid, cid, cid))
    c.execute("SELECT frozen FROM class WHERE cid = %d" % cid)
    frozen = c.fetchone()[0]
    conn.commit()
    if frozen == 1:
        return { "error": Error.CannotUnfreeze.value }
    return {}
@app.route('/api/unfreeze_class', methods=['POST'])
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
    c.execute("UPDATE class set url = ? , note = ? WHERE cid = %d AND frozen = 1" % (cid), (url, note))
    conn.commit()
    return {}
@app.route('/api/modify_class', methods=['POST'])
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
@app.route('/api/all_student_info/<int:cid>', methods=['GET'])
def _all_student_info(cid):
    return jsonify(all_student_info(cid))

def modify_student_info(cid, student_info):
    if not admin_check():
        return { "error": Error.AuthRequired.value }
    global conn
    c = conn.cursor()
    c.execute("UPDATE class set student_info = ? WHERE cid = %d AND frozen = 1" % (cid), (student_info,))
    conn.commit()
    return {}
@app.route('/api/modify_student_info', methods=['POST'])
def _modify_student_info():
    cid = int(request.form['cid'])
    student_info = request.form['student_info']
    json.loads(student_info)  # just to test Json format
    return jsonify(modify_student_info(cid, student_info))

def all_active_class():
    global conn
    c = conn.cursor()
    c.execute("SELECT url FROM class WHERE frozen = 0")
    active_classes = []
    for row in c:
        active_classes.append(row[0])
    return active_classes
@app.route('/api/all_active_class', methods=['GET'])
def _all_active_class():
    return jsonify(all_active_class())

def download_csv(url):
    cid = query_cid_by_url(url)
    if cid is None:
        return { "error": Error.ClassNotFound.value }
    composed = get_composed(cid)
    names = get_student_names(cid)
    min_date = None
    max_date = None
    for name in composed:
        new_composed_name = {}
        for key in composed[name]:
            if min_date is None or time.mktime(min_date) > time.mktime(key):
                min_date = key
            if max_date is None or time.mktime(max_date) < time.mktime(key):
                max_date = key
            new_composed_name[time.strftime("%m-%d",key)] = composed[name][key]
        composed[name] = new_composed_name
    dates = []  # a continuous date from `min_date` to `max_date`
    if min_date is None or max_date is None:
        dates.append(time.strftime("%m-%d", time.localtime()))
    else:
        min_date = datetime.date.fromtimestamp(time.mktime(min_date))
        max_date = datetime.date.fromtimestamp(time.mktime(max_date))
        while min_date <= max_date:
            dates.append(time.strftime("%m-%d",min_date.timetuple()))
            min_date += datetime.timedelta(days=1)
    table = [[""] + ["月".join([a.lstrip("0") for a in d.split('-')])+"日" for d in dates]]
    for name in names:
        row = [name]
        for date in dates:
            if name in composed and date in composed[name]:
                row.append(composed[name][date])
            else:
                row.append("")
        table.append(row)
    csv_file = "\n".join([",".join(row) for row in table])
    return csv_file
@app.route('/api/download_csv/<url>.csv', methods=['GET'])
def _download_csv(url):
    ret = download_csv(url)
    if isinstance(ret, str):
        return Response(ret.encode('gbk'), mimetype="text/csv")
    return jsonify(ret)

def checkval(value):
    if len(value) > 32: return False
    if re.match("^L\d+R\d+(:\d+)?$", value) or re.match("^R\d+L\d+(:\d+)?$", value): return True
    return False
def update_today(url, name, value):
    cid = query_cid_by_url(url)
    names = get_student_names(cid)
    if cid is None:
        return { "error": Error.ClassNotFound.value }
    if not checkval(value) or len(name) > 16:
        return { "error": Error.ERROR_FORMAT.value }
    if not name in names:
        return { "error": Error.ERROR_NAME.value }
    global conn
    c = conn.cursor()
    c.execute("INSERT INTO record (cid, name, value, remote_addr) VALUES (%d, ?, ?, ?)"%cid, (name, value, request.remote_addr))
    conn.commit()
    return { "ok": "update today" }
@app.route('/api/update_today/<url>', methods=['POST'])
def _update_today(url):
    name = request.form['name']
    value = request.form['value']
    return jsonify(update_today(url, name, value))

def update_anyday(cid, name, date, value):
    names = get_student_names(cid)
    if names is None:
        return { "error": Error.CidError.value }
    if not checkval(value) or len(name) > 16:
        return { "error": Error.ERROR_FORMAT.value }
    if not name in names:
        return { "error": Error.ERROR_NAME.value }
    if not re.match("^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d?$", date):
        return { "error": Error.ERROR_DATE.value }
    global conn
    c = conn.cursor()
    c.execute("INSERT INTO record (cid, name, value, remote_addr, time) VALUES (%d, ?, ?, ?, ?)"%cid, (name, value, request.remote_addr, date))
    conn.commit()
    return { "ok": "update_anyday" }
@app.route('/api/update_anyday/<int:cid>', methods=['POST'])
def _update_anyday(cid):
    name = request.form['name']
    date = request.form['date']
    value = request.form['value']
    return jsonify(update_anyday(cid, name, date, value))

#
# configuration
#

if __name__ == "__main__":
    # local test
    app.config['SECRET_KEY'] = keys.SECRET_KEY
    app.debug = True
    conn = sqlite3.connect("./shuttlecock.db", check_same_thread=False)
else:  # production mode
    # conn = sqlite3.connect("/home/admin/shuttlecock.db", check_same_thread=False)
    app.config['SECRET_KEY'] = keys.SECRET_KEY
    conn = sqlite3.connect("./shuttlecock.db", check_same_thread=False)

conn.execute('''
CREATE TABLE IF NOT EXISTS class (
cid INTEGER PRIMARY KEY AUTOINCREMENT,
url VARCHAR(16) default '',
note NVARCHAR(64) default '',
frozen BOOLEAN default 1,
student_info NVARCHAR(65536) default '[]',
create_time TIMESTAMP default (datetime('now', 'localtime'))
);
''')

conn.execute('''
CREATE TABLE IF NOT EXISTS record (
rid INTEGER PRIMARY KEY AUTOINCREMENT,
cid INTEGER,
name NVARCHAR(64),
value NVARCHAR(64),
remote_addr NVARCHAR(64),
time TIMESTAMP default (datetime('now', 'localtime'))
);
''')

if __name__ == "__main__":
    app.run()
