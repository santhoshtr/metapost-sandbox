
import PocketBase from './pocketbase.es.js'

var editor;
var editor, slug, loginBtn, saveBtn, compileBtn, shareBtn, sampleid;
var pockethost_client;
var authData;

function onLogin() {
    if (!authData) {
        return
    }
    const link = document.createElement('a');
    link.href = `/u/${authData.record.id}`
    link.title = authData.record.username
    const avatarImg = document.createElement('img');
    avatarImg.src = `https://github.com/${authData.record.username}.png?size=24`
    avatarImg.width = '24';
    link.appendChild(avatarImg)

    loginBtn.innerHTML = ''
    loginBtn.appendChild(link)
    saveBtn.removeAttribute("disabled");
}

async function doGithubLogin() {
    try {
        authData = await pockethost_client.collection('users').authWithOAuth2({ provider: 'github' });
        onLogin()

    } catch (error) {
        console.error('Login failed:', error);
    }
}

async function queryCollection() {
    try {
        const collection = pockethost_client.collection('metaposts');
        const records = await collection.getList();
        console.dir(records);
    } catch (error) {
        console.error('Query failed:', error);
    }
}


function changeurl(url, title) {
    var new_url = '/m/' + url;
    window.history.pushState('data', title, new_url);

}

async function doSave() {
    if (!authData) {
        await doGithubLogin()
    }
    document.getElementById('log').innerText = 'Saving..';
    const title = document.getElementById('title').value;
    var record;
    try {
        const data = {
            "author": authData.record.id,
            "title": title,
            "metapost": editor.getValue()
        };

        if (sampleid) {
            record = await pockethost_client.collection('metaposts').update(sampleid, data);
        } else {
            record = await pockethost_client.collection('metaposts').create(data);
            document.getElementById('title').value = result.title
            sampleid = record.id
            changeurl(sampleid, title)
        }
        document.getElementById('log').innerHTML = `Saved the code`
    } catch (error) {
        console.error('Save failed:', error);
        document.getElementById('log').innerText = `Save failed ${error}`
    }
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
    if (!sampleid) {
        alert(`Save the work first to share`);
        return;
    }
    var url = `https://${window.location.host}/${sampleid}`
    try {
        navigator.clipboard.writeText(url)
    } catch (err) {
        //pass
    }
    alert(`URL Copied to clipboard: ${url}`);
}

document.addEventListener("DOMContentLoaded", async (event) => {
    loginBtn = document.getElementById('b-login');
    saveBtn = document.getElementById('b-save');
    compileBtn = document.getElementById('b-compile');
    shareBtn = document.getElementById('b-share');

    loginBtn.addEventListener('click', doGithubLogin);
    compileBtn.addEventListener('click', doCompile);
    saveBtn.addEventListener('click', doSave);
    shareBtn.addEventListener('click', doShare);

    pockethost_client = new PocketBase('https://santhosh.pockethost.io');

    if (window.CodeMirror) {
        editor = CodeMirror.fromTextArea(
            document.getElementById('metapost'),
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
        sampleid = document.getElementById('sampleid').value;
        if (sampleid) {
            doCompile();
        }
    }
    try {
        authData = await pockethost_client.collection('users').authRefresh();
        onLogin()
    } catch (err) {
        //pass
    }
});

