function doCompile() {
    const code = document.getElementById('mpostcode').value;
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
                document.getElementById('log').innerHTML = result.stderr
                document.getElementById('result').innerHTML = 'Error'
                return
            }
            document.getElementById('log').innerHTML = result.stdout
            document.getElementById('result').innerHTML = result.svg
        })
}
