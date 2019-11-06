
// helper functions
function Lw(x) { return "{"+(x==undefined?("\\color{red}{\\mathbf{undefined}}"):x)+"}"; }  // latex warp
function Red(x) { return "\\color{red}"+Lw(x); }
function Green(x) { return "\\color{green}"+Lw(x); }
function Uni(x) { return x; }
function Mathtt(x) { return "\\mathtt" + Lw(x); }

/*
 * Logic System
 */

class System {
    constructor(template) {
        this.sql_tables = [];
        this.private_apis = [];
        this.public_apis = [];
        this.template = template;
        this.operational_specifications = [];
        this.description_specifications = [];
    }
    append_sql_table(table) {
        console.assert(SqlDatabaseTable.prototype.isPrototypeOf(table), "type error");
        this.sql_tables.push(table);
    }
    append_private_api(private_api) {
        console.assert(API.prototype.isPrototypeOf(private_api), "type error");
        this.private_apis.push(private_api);
    }
    append_public_api(public_api) {
        console.assert(API.prototype.isPrototypeOf(public_api), "type error");
        this.public_apis.push(public_api);
    }
    append_operational_specification(spec) {
        console.assert(Specification.prototype.isPrototypeOf(spec), "type error");
        this.operational_specifications.push(spec);
    }
    append_description_specification(spec) {
        console.assert(Specification.prototype.isPrototypeOf(spec), "type error");
        this.description_specifications.push(spec);
    }
    flatten_values(obj) {
        let values = [];
        let keys = Object.keys(obj);
        for (let i=0; i<keys.length; ++i) {
            if (typeof(obj[keys[i]]) == 'string') values.push(obj[keys[i]]);
            else values = values.concat(this.flatten_values(obj[keys[i]]));
        }
        return values;
    }
    set_type(type) {
        let values = this.flatten_values(type);
        let found_equals = [];
        while (values.length > 0) {
            let val = values.pop();
            for (let i=0; i<values.length; ++i) if (val == values[i]) found_equals.push(val);
        }
        if (found_equals.length > 0) {
            console.error("found equal type strings: " + found_equals)
        } else this.type = type;
    }
    render() {
        $("#write").html(this.template);
        let operational_specification_html = "";
        for (let i=0; i<this.operational_specifications.length; ++i) {
            operational_specification_html += this.operational_specifications[i].to_html(this);
        }
        $("#operational_specification").html(operational_specification_html);
        let description_specification_html = "";
        for (let i=0; i<this.description_specifications.length; ++i) {
            description_specification_html += this.description_specifications[i].to_html(this);
        }
        $("#description_specification").html(description_specification_html);
        let database_design_html = "";
        for (let i=0; i<this.sql_tables.length; ++i) {
            database_design_html += this.sql_tables[i].to_html(this);
        }
        $("#database_design").html(database_design_html);
        let private_apis_html = "";
        for (let i=0; i<this.private_apis.length; ++i) {
            private_apis_html += this.private_apis[i].to_html(this);
        }
        $("#private_APIs").html(private_apis_html);
        let public_apis_html = "";
        for (let i=0; i<this.public_apis.length; ++i) {
            public_apis_html += this.public_apis[i].to_html(this);
        }
        $("#public_APIs").html(public_apis_html);
    }
}

/*
 * Sql Database Definition
 */

const SqlDatabaseTableTypes = {
    UNKNOWN: [0],
    INTEGER: [1],
    VARCHAR: [2,0],  // args[1] is the length of varchar
    CHAR: [3,0],  // args[1] is the length of char
    BOOLEAN: [4],
    JSONB: [5],
    TIMESTAMP: [6],
    toString(type) {
        if (type[0] == 0) return Red("UNKNOWN");
        if (type[0] == 1) return "INTEGER";
        if (type[0] == 2) return "VARCHAR(" + type[1] + ")";
        if (type[0] == 3) return "CHAR(" + type[1] + ")";
        if (type[0] == 4) return "BOOLEAN";
        if (type[0] == 5) return "JSONB";
        if (type[0] == 6) return "TIMESTAMP";
    }
}
const SDTT = SqlDatabaseTableTypes;

class SqlDatabaseTable {
    constructor(name, table, description) {
        this.name = name;
        this.table = table;
        this.keys = [];
        this.description = description;
    }
    append_key(key, type=SDTT.UNKNOWN, unique=false) {
        this.keys.push({
            key,
            type,
            unique,
        });
    }
    to_latex() {
        let keys_mat = "";
        for (let i=0; i<this.keys.length; ++i) {
            if (keys_mat.length != 0) keys_mat += "\\\\";
            keys_mat += 
                "\\mathtt" + Lw((this.keys[i].unique?Green:Uni)(this.keys[i].key.replace(/_/g, "\\_"))) + " & " +
                "\\mathtt" + Lw(SDTT.toString(this.keys[i].type)
                );
        }
        return Lw(this.name) + "_" + Lw("\\small{\\left(\\begin{smallmatrix}" + keys_mat + "\\end{smallmatrix}\\right)}");
    }
    to_html() {
        return `<h4 style="display:inline;">\\(${this.name}\\):&nbsp;${this.table}</h4>`
            + `<p style="display:inline; margin-left: 20px;">${this.description}</p>`
            + "$$" + this.to_latex() + "$$";
    }
}

const LinearPropositionType = {
    ATOM_NOT: -1,  // A^{⊥}
    ATOM: 0,  // A
    DEDUCTION: 1,  // A ⊸ B
    TENSOR: 2,  // ⊗
    PLUS: 3,  // ⊕
    WITH: 4,  // &
    PAR: 5,  // ⅋
    BANG: 6,  // !
    WHY_NOT: 7,  // ?
    TENSOR_UNIT: 8,  // 1
    PLUS_UNIT: 9,  // 0
    WITH_UNIT: 10,  // ⊤,
    PAR_UNIT: 11,  // ⊥
    OPERATION: 12,  // subscript representing operation on object
};
const LPT = LinearPropositionType;

// A ::= p ∣ p⊥ ∣ A ⊗ A ∣ A ⊕ A ∣ A & A ∣ A ⅋ A ∣ 1 ∣ 0 ∣ ⊤ ∣ ⊥ ∣ !A ∣ ?A
class LinearProposition {
    constructor(type=LPT.ATOM, ...args) {
        this.type = type;
        this.args = [...args];
    }
    without_parentheses() {
        if (this.type == LPT.ATOM_NOT) return true;
        if (this.type == LPT.ATOM) return true;
        if (this.type == LPT.TENSOR_UNIT) return true;
        if (this.type == LPT.PLUS_UNIT) return true;
        if (this.type == LPT.WITH_UNIT) return true;
        if (this.type == LPT.PAR_UNIT) return true;
        if (this.type == LPT.OPERATION) return true;
        return false;
    }
    to_latex() {
        if (this.type == LPT.ATOM) {
            return Lw(this.args[0]);
        }
        if (this.type == LPT.ATOM_NOT) {
            return Lw(this.args[0]) + "^{\\perp}";
        }
        if (this.type == LPT.BANG) {
            return "!\\left(" + this.args[0].to_latex() + "\\right)";
        }
        if (this.type == LPT.TENSOR_UNIT) {
            return "1";
        }
        if (this.type == LPT.DEDUCTION) {
            let s = "";
            if (this.args[0].without_parentheses()) s += this.args[0].to_latex();
            else s += "\\left(" + this.args[0].to_latex() + "\\right)";
            s += "\\multimap";
            if (this.args[1].without_parentheses()) s += this.args[1].to_latex();
            else s += "\\left(" + this.args[1].to_latex() + "\\right)";
            return s;
        }
        if (this.type == LPT.TENSOR) {
            let s = "";
            if (this.args[0].without_parentheses()) s += this.args[0].to_latex();
            else s += "\\left(" + this.args[0].to_latex() + "\\right)";
            for (let i=1; i<this.args.length; ++i) {
                s += "\\otimes";
                if (this.args[i].without_parentheses()) s += this.args[i].to_latex();
                else s += "\\left(" + this.args[i].to_latex() + "\\right)";
            }
            return s;
        }
        if (this.type == LPT.PLUS) {
            let s = "";
            if (this.args[0].without_parentheses()) s += this.args[0].to_latex();
            else s += "\\left(" + this.args[0].to_latex() + "\\right)";
            for (let i=1; i<this.args.length; ++i) {
                s += "\\oplus";
                if (this.args[i].without_parentheses()) s += this.args[i].to_latex();
                else s += "\\left(" + this.args[i].to_latex() + "\\right)";
            }
            return s;
        }
        if (this.type == LPT.OPERATION) {
            console.assert(this.args[0].type == LPT.ATOM, "operation only allowed on atoms");
            console.assert(this.args.length >= 2 && "empty operation list not allowed");
            let s = this.args[0].to_latex() + "_{" + Mathtt(this.args[1]);
            for (let i=2; i<this.args.length; ++i) s += ";" + Mathtt(this.args[i]);
            s += "}";
            return s;
        }
        console.assert(false, "type not supported");
        return "\\mathtt{\\color{red}{UNKNOWN}}"
    }
}
function NLP(...args) { return new LinearProposition(...args); }

class API {
    constructor(name, description, proposition) {
        this.name = name;
        this.description = description;
        this.proposition = proposition;
    }
    to_proposition_latex() {
        return new LinearProposition(LinearPropositionType.BANG, this.proposition, null).to_latex();
    }
    to_html() {
        let proposition_latex = "\\mathtt{\\color{red}{INVALID\\_PROPOSITION}}";
        if (this.proposition) {
            console.assert(LinearProposition.prototype.isPrototypeOf(this.proposition), "type error");
            proposition_latex = this.to_proposition_latex();
        }
        return `<h4 style="display:inline;" id="api_${this.name}">${this.name}</h4>`
            + `<p style="display:inline; margin-left: 20px;">${this.description}</p>`
            + "$$" + proposition_latex + "$$";
    }
}

class Specification {
    constructor(title, content) {
        this.title = title;
        this.content = content;
        this.required_public_apis = [];
    }
    require_public_api(name) {
        this.required_public_apis.push(name);
        return this;
    }
    to_html(sys) {
        let require_public_api_html = "";
        for (let i in this.required_public_apis) {
            let required_public_api = this.required_public_apis[i];
            let found = undefined;
            for (let j in sys.public_apis) {
                let api = sys.public_apis[j];
                if (api.name == required_public_api) { found = api; break; }
            }
            require_public_api_html += `<blockquote>
            <p>${found?"<a href='#api_"+required_public_api+"'>":"<strong style='color:red'>"
            }${required_public_api}${found?"<span style='margin-left: 20px;'>\\("+found.to_proposition_latex()+"\\)</span></a>":""}</p>
            </blockquote>
            `;
        }
        return `<h4>${this.title}</h4>`
            + `<p>${this.content}</p>`
            + require_public_api_html;
    }
}
