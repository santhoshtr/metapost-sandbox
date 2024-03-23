var sampleid = 0;
var editor;

function doSave() {
    document.getElementById('log').innerText = 'Saving..';
    if (sampleid > 0) {
        api = `/api/samples/${sampleid}`
    } else {
        api = `/api/samples`
    }
    fetch(api, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: document.getElementById('name').value,
            code: editor.getValue()
        })
    }).then(response => response.json())
        .then(result => {
            document.getElementById('name').value = result.name
            document.getElementById('log').innerHTML = `Saved the code`
            sampleid = result.id
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
    if (!sampleid || sampleid < 1 ){
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
    sampleid = parseInt(document.getElementById('sampleid').value);
    if (sampleid > 0) {
        doCompile();
    }
});

