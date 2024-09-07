
import PocketBase from './pocketbase.es.js'
import { annotate } from './svgannotate.js'

var editor;
var editor, authorid, loginBtn, profileBtn, saveBtn, exportBtn, compileBtn, logoutBtn, sampleid;
var pockethost_client;
var authData;

function onLogin() {
    if (!authData) {
        return
    }
    const worksLink = document.getElementById('b-works');;
    worksLink.href = `/u/${authData.record.username}`
    worksLink.parentElement.classList.remove('hidden');
    const avatarImg = document.createElement('img');
    avatarImg.src = `https://github.com/${authData.record.username}.png?size=24`
    avatarImg.width = '24';

    profileBtn.innerHTML = ''
    profileBtn.appendChild(avatarImg)
    loginBtn.parentElement.remove()
    logoutBtn.parentElement.classList.remove('hidden');
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

function changeurl(url, title) {
    var new_url = '/m/' + url;
    window.history.pushState('data', title, new_url);

}

async function doSave() {
    try {
        doCompile();
    } catch (error) {
        //pass
    }
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

        if (sampleid && authorid && authorid === authData.record.id) {
            record = await pockethost_client.collection('metaposts').update(sampleid, data);
            document.getElementById('log').innerHTML = `Updated the code ${sampleid}`
        } else {
            record = await pockethost_client.collection('metaposts').create(data);
            sampleid = record.id
            authorid = authData.record.id
            changeurl(sampleid, title)
            document.getElementById('log').innerHTML = `Saved the code: ${sampleid}`
        }

    } catch (error) {
        console.error('Save failed:', error);
        document.getElementById('log').innerText = `Save failed ${error}`
    }
}

function doLogout() {
    try {
        pockethost_client.authStore.clear();
        window.location.href = '/';
    } catch (error) {
        console.error('Lgout failed:', error);
    }
}

function exportSVG() {
    const svgEl = document.getElementById('result').querySelector('svg');
    const name = `${sampleid}.svg`;
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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
            const originalSVG = document.getElementById('result').querySelector('svg');
            // incrrease the viewBox of the svg by 10%
            const width = originalSVG.getAttribute('width');
            const height = originalSVG.getAttribute('height');
            const newViewBox = `${-20} ${-20} ${width * 1.1} ${height * 1.1}`;
            originalSVG.setAttribute('viewBox', newViewBox);
            originalSVG.setAttribute('id', originalSVG);
            annotate(originalSVG);
        })
}



document.addEventListener("DOMContentLoaded", async (event) => {
    loginBtn = document.getElementById('b-login');
    profileBtn = document.getElementById('b-profile');
    saveBtn = document.getElementById('b-save');
    compileBtn = document.getElementById('b-compile');
    logoutBtn = document.getElementById('b-logout');
    exportBtn = document.getElementById('b-export');


    loginBtn.addEventListener('click', doGithubLogin);
    exportBtn?.addEventListener('click', exportSVG);
    compileBtn && compileBtn.addEventListener('click', doCompile);
    saveBtn && saveBtn.addEventListener('click', doSave);
    logoutBtn && logoutBtn.addEventListener('click', doLogout);

    const titleElement = document.getElementById('title');
    titleElement && titleElement.addEventListener('keydown', function (e) {
        if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
            doSave();
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            doSave();
            e.preventDefault();
        }
    });

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
        let debouncer;
        editor.on("change", () => {
            clearTimeout(debouncer)  //clear any existing timeout
            debouncer = setTimeout(doCompile, 500);

        });
        sampleid = document.querySelector("meta[name='sampleid']")?.getAttribute("content");
        authorid = document.querySelector("meta[name='authorid']")?.getAttribute("content");
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

