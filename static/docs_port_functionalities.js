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
// Sql Database Design
//

let M = new SqlDatabaseTable("C",
    table="class",
    description="存储班级信息的表，对<code>cid</code>和<code>name</code>唯一");
M.append_key("cid", SDTT.INTEGER, unique=true);
M.append_key("name", Object.assign(SDTT.VARCHAR.concat(), {1:16}), unique=true);
M.append_key("frozen", SDTT.BOOLEAN);
M.append_key("student_info", SDTT.JSONB);
M.append_key("create_time", SDTT.TIMESTAMP);
sys.append_sql_table(M);

//
// Type Design
//

const T = {
    Error: {
        DatabaseError: "E^\\mathtt{DatabaseError}",
        ClassNotFound: "E^\\mathtt{ClassNotFound}",
    },
    Class: {
        collection: "C",
        any: "C^\\mathtt{any}",
        cid: "C^\\mathtt{cid}",
        name: "C^\\mathtt{name}",
    }
};
sys.set_type(T);

//
// Private API Design
//

let query_class_by_name = new API("query_class_by_name", 
    description="通过字符串的班级名称来查找班级，并返回完整的班级信息",
    proposition = NLP(LPT.DEDUCTION,
        NLP(LPT.ATOM, T.Class.name),
        NLP(LPT.DEDUCTION,
            NLP(LPT.ATOM, T.Class.collection),
            NLP(LPT.TENSOR, 
                NLP(LPT.ATOM, T.Class.collection),
                NLP(LPT.PLUS,
                    NLP(LPT.ATOM, T.Error.ClassNotFound),
                    NLP(LPT.ATOM, T.Class.any),
                ),
            ),
        ),
    ),
); sys.append_private_api(query_class_by_name);

$(function() {
    sys.render();
    MathJax.typeset();
})
