
var editor;
var access_token;
const token_key = "metapost_sandbox_token"
var slug;

function slugify(str) {
    return String(str)
        .normalize('NFKD') // split accented characters into their base characters and diacritical marks
        .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
        .trim() // trim leading or trailing whitespace
        .toLowerCase() // convert to lowercase
        .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-') // remove consecutive hyphens
        .substring(0, 240);
}

function changeurl(url, title) {
    var new_url = '/' + url;
    window.history.pushState('data', title, new_url);

}

function doSave() {
    document.getElementById('log').innerText = 'Saving..';
    const name = document.getElementById('name').value;
    if (!slug || !slug.endsWith(access_token)) {
        // save as new one
        slug = `${slugify(name)}-${access_token}`
    }

    fetch('/api/samples', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: slug,
            name: name,
            code: editor.getValue()
        })
    }).then(response => response.json())
        .then(result => {
            document.getElementById('name').value = result.name
            document.getElementById('log').innerHTML = `Saved the code`
            sampleid = result.id
            changeurl(slug, result.name)
        })
}


function doCompile() {
    const code = editor.getValue()
    document.getElementById('log').innerText = 'Compiling..';
    fetch(`/api/compile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
    }).then(response => response.json())
        .then(result => {
            if (!result.svg) {
                document.getElementById('log').innerHTML = result.stdout + '\n' + result.stderr;
                document.getElementById('result').innerHTML = 'Error'
                return
            }
            document.getElementById('log').innerHTML = result.stdout
            document.getElementById('result').innerHTML = result.svg
        })
}


function doShare() {
    if (!slug) {
        alert(`Save the work first to share`);
        return;
    }
    var url = `https://${window.location.host}/${slug}`
    try {
        navigator.clipboard.writeText(url)
    } catch (err) {
        //pass
    }
    alert(`URL Copied to clipboard: ${url}`);
}

function setCookie(name, value, days) {
    let expires = new Date();
    expires.setDate(expires.getDate() + days);
    document.cookie = name + '=' + value + '; expires=' + expires.toUTCString() + '; SameSite=Lax ;path=/';
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

document.addEventListener("DOMContentLoaded", (event) => {
    editor = CodeMirror.fromTextArea(
        document.getElementById('mpostcode'),
        {
            lineNumbers: true,
            mode: "metapost",
            theme: "nord",
            extraKeys: {
                "Ctrl-S": doSave,
                "Ctrl-R": doCompile
            }
        });
    editor.on("change", doCompile);
    slug = document.getElementById('slug').value;
    if (slug) {
        doCompile();
    }

    access_token = getCookie(token_key)
    if (!access_token) {
        access_token = crypto.randomUUID().toString().substr(0, 8);
        setCookie(token_key, access_token, 365 * 10);
    }
});

