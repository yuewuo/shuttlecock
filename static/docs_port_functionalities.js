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

sys.append_description_specification(new Specification(
    "存在管理员，可通过密码登录", 
    "为了有效保护管理员的密码，网站服务器需要使用https，本系统仅针对https保护的服务器设计，除此之外不提供安全保证！" + 
    "管理员的密码需要通过后台设置，为了简化设计，这里采用全局唯一的密码，密码设置在应用中固定，默认为admin，用户必须手动修改" + 
    "<code>application.py</code>中的<code>ADMIN_PASSWORD</code>字符串变量来重置密码"
)
.require_public_api("admin_login")
);

sys.append_description_specification(new Specification(
    "用户可以得知自己是否拥有管理员权限", 
    "前端程序可以根据这个API来决定是否在某些情况下请求用户输入密码以登录"
)
.require_public_api("admin_check")
);

sys.append_description_specification(new Specification(
    "管理员可以新建班级", 
    "返回创建班级的全局唯一cid，之后所有有关班级的操作都是围绕cid进行的"
)
.require_public_api("new_class")
);

sys.append_description_specification(new Specification(
    "管理员可以查看所有的班级的所有信息，包括已经冻结的", 
    "返回一个json数组，所有元素包括cid的值"
)
.require_public_api("all_class_info")
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
        NotImplement: "E^\\mathtt{NotImplement}",
        DatabaseError: "E^\\mathtt{DatabaseError}",
        ClassNotFound: "E^\\mathtt{ClassNotFound}",
        PasswordError: "E^\\mathtt{PasswordError}",
        AuthRequired: "E^\\mathtt{AuthRequired}",
    },
    Class: {
        collection: "C",
        any: "C^\\mathtt{any}",
        list: "C^\\mathtt{list}",
        cid: "C^\\mathtt{cid}",
        url: "C^\\mathtt{url}",
    },
    Session: {
        data: "S",
        admin: "S^\\mathtt{admin}",
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

$(function() {
    sys.render();
    MathJax.typeset();
})
