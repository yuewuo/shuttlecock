html_template =  `
<h1>中华毽线上平台开发者文档</h1>
<p style="color:grey;">本文档使用 JavaScript 脚本构建，可以方便地维护多个版本的文档，你可以通过修改地址栏的<code>file</code>参数值来浏览之前的版本。新版本的演进需要遵从以下规则：1. 拷贝前一个版本的js文件并重新命名 2. 修改html文件的<code>CURRENT_VERSION</code>变量为新的文件名来默认打开最新版本 3. 在js文件中修改功能，如果修改后的系统违背了之前的约束则会显示报错，开发者需要重新修改系统以满足之前的规约。以这样方式演变加强了设计的可延续性，比如最先设计的安全规则，之后的修改不能违背这些规则；对于一个较为庞大的系统或是比较流动的团队，这样一个保证是至关重要的，开发者的更改往往伴随着对以前功能完整性的破坏，而文档的重要性在于描述完整性，甚至进一步限制并提醒这样的破坏。</p>
<h2>操作性规约</h2>
<p><em>此部分描述用户如何与系统交互，具体的功能如何实现</em></p>
<div id="operational_specification"></div>
<h2>描述性规约</h2>
<p><em>这部分描述一些系统比较满足的性质，主要为描述性的，比如安全性要求</em></p>
<div id="description_specification"></div>
<h2>数据库设计</h2>
<div id="database_design"></div>
<h2>私有 API</h2>
<div id="private_APIs"></div>
<h2>公开 API</h2>
<div id="public_APIs"></div>
`;

var sys = new System(template=html_template);

//
// Operational Specification
//

sys.append_operational_specification(new Specification(
    "存在管理员，可通过密码登录", 
    "为了有效保护管理员的密码，网站服务器需要使用https，本系统仅针对https保护的服务器设计，除此之外不提供安全保证！" + 
    "管理员的密码需要通过后台设置，为了简化设计，这里采用全局唯一的密码，密码设置在应用中固定，默认为admin，用户必须手动修改" + 
    "<code>application.py</code>中的<code>ADMIN_PASSWORD</code>字符串变量来重置密码"
)
.require_public_api("admin_login")
);

sys.append_operational_specification(new Specification(
    "用户可以得知自己是否拥有管理员权限", 
    "前端程序可以根据这个API来决定是否在某些情况下请求用户输入密码以登录"
)
.require_public_api("admin_check")
);

sys.append_operational_specification(new Specification(
    "管理员可以新建班级", 
    "返回创建班级的全局唯一cid，之后所有有关班级的操作都是围绕cid进行的"
)
.require_public_api("new_class")
);

sys.append_operational_specification(new Specification(
    "管理员可以查看所有的班级的所有信息，包括已经冻结的", 
    "返回一个json数组，所有元素包括cid的值"
)
.require_public_api("all_class_info")
);

sys.append_operational_specification(new Specification(
    "管理员可以冻结和解锁班级，比如已经结束的学期应当冻结，随时可以恢复", 
    "可能返回几种错误，见下列API"
)
.require_public_api("freeze_class")
.require_public_api("unfreeze_class")
);

sys.append_operational_specification(new Specification(
    "管理员可以修改班级的url和描述信息", 
    "url为最多16个英文和数字字符，描述信息可以是65536个字符的任意信息，包括中文"
)
.require_public_api("modify_class")
);

sys.append_operational_specification(new Specification(
    "管理员可以获取某一个班级的所有学生信息", 
    "输出为一个列表对象，每一项代表一名学生，每一项里面包含<code>n</code>姓名和可选的<code>d</code>描述信息"
)
.require_public_api("all_student_info")
);

sys.append_operational_specification(new Specification(
    "管理员可以修改一个班级的所有学生信息", 
    "给定一个字符串的Json数据，修改数据库项目；这个步骤是不可逆的，丢失的信息无法追回，除非有其他备份方式"
)
.require_public_api("modify_student_info")
);

//
// Description Specification
//


//
// Sql Database Design
//

let C = new SqlDatabaseTable("C",
    table="class",
    description="存储班级信息的表，对<code>cid</code>唯一，且<code>frozen</code>为false的不能有相同的<code>url</code>");
C.append_key("cid", SDTT.INTEGER, unique=true);
C.append_key("url", Object.assign(SDTT.VARCHAR.concat(), {1:16}));
C.append_key("note", Object.assign(SDTT.VARCHAR.concat(), {1:64}));
C.append_key("frozen", SDTT.BOOLEAN);
C.append_key("student_info", Object.assign(SDTT.VARCHAR.concat(), {1:65536}));
C.append_key("create_time", SDTT.TIMESTAMP);
sys.append_sql_table(C);

//
// Type Design
//

const T = {
    Error: {
        any: "E^\\mathtt{any}",
        NotImplement: "E^\\mathtt{NotImplement}",
        DatabaseError: "E^\\mathtt{DatabaseError}",
        ClassNotFound: "E^\\mathtt{ClassNotFound}",
        PasswordError: "E^\\mathtt{PasswordError}",
        AuthRequired: "E^\\mathtt{AuthRequired}",
        UrlInUse: "E^\\mathtt{UrlInUse}",
        FrozenRequired: "E^\\mathtt{FrozenRequired}",
        CidError: "E^\\mathtt{CidError}",
        JsonFormatError: "E^\\mathtt{JsonFormatError}",
    },
    Class: {
        collection: "C",
        any: "C^\\mathtt{any}",
        list: "C^\\mathtt{list}",
        cid: "C^\\mathtt{cid}",
        url: "C^\\mathtt{url}",
        note: "C^\\mathtt{note}",
        student: "C^\\mathtt{student}"
    },
    Session: {
        data: "s",
        admin: "s^\\mathtt{admin}",
    },
    Password: "P",
};
sys.set_type(T);

//
// Private API Design
//

let query_cid_by_url = new API("query_cid_by_url", 
    description="通过字符串的班级链接来查找班级，返回cid的值",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Class.url),
        NLP(LPT.DEDUCTION,
            NLP(LPT.ATOM, T.Class.collection),
            NLP(LPT.TENSOR, 
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.PLUS,
                    NLP(LPT.ATOM, T.Error.ClassNotFound),
                    NLP(LPT.ATOM, T.Class.cid),
                ),
            ),
        ),
    ),
); sys.append_private_api(query_cid_by_url);

//
// Public API Design
//

let admin_login = new API("admin_login",
    description="通过密码登录，并存储在session里面以供之后使用（错误的密码会另session失效）",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Password),
        NLP(LPT.DEDUCTION,
            NLP(LPT.ATOM, T.Session.data),
            NLP(LPT.TENSOR,
                NLP(LPT.OPERATION, NLP(LPT.ATOM, T.Session.data), "admin=?"),
                NLP(LPT.PLUS,
                    NLP(LPT.ATOM, T.Error.PasswordError),
                    NLP(LPT.TENSOR_UNIT),
                ),
            ),
        ),
    ),
); sys.append_public_api(admin_login);

let admin_check = new API("admin_check",
    description="如果session里存在<code>admin=true</code>返回1，否则返回AuthenticationRequired错误",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Session.data),
        NLP(LPT.TENSOR,
            NLP(LPT.ATOM, T.Session.data),
            NLP(LPT.PLUS,
                NLP(LPT.ATOM, T.Error.AuthRequired),
                NLP(LPT.TENSOR_UNIT),
            ),
        ),
    ),
); sys.append_public_api(admin_check);

function auth_required(next) {
    return NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Session.data),
        NLP(LPT.TENSOR,
            NLP(LPT.ATOM, T.Session.data),
            NLP(LPT.PLUS,
                NLP(LPT.ATOM, T.Error.AuthRequired),
                next,
            ),
        ),
    );
}

let new_class = new API("new_class",
    description="创建班级，一旦创建则不可删除；除<code>cid</code>其他字段均可改动",
    proposition = auth_required(
        NLP(LPT.DEDUCTION,
            NLP(LPT.ATOM, T.Class.collection),
            NLP(LPT.TENSOR,
                NLP(LPT.OPERATION, 
                    NLP(LPT.ATOM, T.Class.collection),
                    "\\cup default"),
                NLP(LPT.ATOM, T.Class.cid),
            ),
        ),
    ),
); sys.append_public_api(new_class);

let all_class_info = new API("all_class_info",
    description="获取当前数据库所有班级的信息",
    proposition = auth_required(
        NLP(LPT.DEDUCTION,
            NLP(LPT.ATOM, T.Class.collection),
            NLP(LPT.TENSOR,
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.ATOM, T.Class.list),
            ),
        ),
    ),
); sys.append_public_api(all_class_info);

let freeze_class = new API("freeze_class",
    description="冻结班级，此操作在有管理员权限下无条件成功",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Class.cid),
        auth_required(
            NLP(LPT.DEDUCTION,
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.OPERATION, 
                    NLP(LPT.ATOM, T.Class.collection),
                    "\\{frozen=true|cid\\}",
                ),
            ),
        ),
    ),
); sys.append_public_api(freeze_class);

let unfreeze_class = new API("unfreeze_class",
    description="解锁班级，可能会发生几种错误：管理员权限错误、url冲突错误",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Class.cid),
        auth_required(
            NLP(LPT.DEDUCTION,
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.PLUS,
                    NLP(LPT.TENSOR,
                        NLP(LPT.ATOM, T.Class.collection),
                        NLP(LPT.ATOM, T.Error.UrlInUse),
                    ),
                    NLP(LPT.TENSOR,
                        NLP(LPT.OPERATION, 
                            NLP(LPT.ATOM, T.Class.collection),
                            "\\{frozen=false|cid\\}",
                        ),
                        NLP(LPT.TENSOR_UNIT),
                    ),
                ),
            ),
        ),
    ),
); sys.append_public_api(unfreeze_class);

let modify_class = new API("modify_class",
    description="修改班级信息，要求班级为冻结状态才能够修改",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.TENSOR,
            NLP(LPT.ATOM, T.Class.cid),
            NLP(LPT.ATOM, T.Class.url),
            NLP(LPT.ATOM, T.Class.note),
        ),
        auth_required(
            NLP(LPT.DEDUCTION,
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.PLUS,
                    NLP(LPT.TENSOR,
                        NLP(LPT.ATOM, T.Class.collection),
                        NLP(LPT.ATOM, T.Error.FrozenRequired),
                    ),
                    NLP(LPT.TENSOR,
                        NLP(LPT.OPERATION, 
                            NLP(LPT.ATOM, T.Class.collection),
                            "\\{url',note'|cid\\}",
                        ),
                        NLP(LPT.TENSOR_UNIT),
                    ),
                ),
            ),
        ),
    ),
); sys.append_public_api(modify_class);

let all_student_info = new API("all_student_info",
    description="获取班级的学生信息",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Class.cid),
        auth_required(
            NLP(LPT.DEDUCTION,
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.TENSOR,
                    NLP(LPT.ATOM, T.Class.collection),
                    NLP(LPT.PLUS,
                        NLP(LPT.ATOM, T.Error.CidError),
                        NLP(LPT.ATOM, T.Class.student),
                    ),
                ),
            ),
        ),
    ),
); sys.append_public_api(all_student_info);

let modify_student_info = new API("modify_student_info",
    description="修改班级的学生信息，保证插入的是合法Json数据；要求班级处于被冻结状态才能修改",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.TENSOR,
            NLP(LPT.ATOM, T.Class.cid),
            NLP(LPT.ATOM, T.Class.student),
        ),
        auth_required(
            NLP(LPT.DEDUCTION,
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.PLUS,
                    NLP(LPT.TENSOR,
                        NLP(LPT.ATOM, T.Class.collection),
                        NLP(LPT.ATOM, T.Error.any),
                    ),
                    NLP(LPT.TENSOR,
                        NLP(LPT.OPERATION, 
                            NLP(LPT.ATOM, T.Class.collection),
                            "\\{student\\_info=?|cid\\}",
                        ),
                        NLP(LPT.TENSOR_UNIT),
                    ),
                ),
            ),
        ),
    ),
); sys.append_public_api(modify_student_info);

$(function() {
    sys.render();
    MathJax.typeset();
})
