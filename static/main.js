const placeholdercode = `
beginfig(0);
width:=100;
rotation:=45;

pen calligraphicpen ;
calligraphicpen := makepen ((0, 0)--(width,0 ) rotated rotation) ;

z0 = (x1+150, 0);
z1 = (0, y0+250);
z2 = (x1+250, y1+250);
z3 = (x2+250, y1);
z4 = (x2, y0);
pickup calligraphicpen;
draw z0..z1..z2..z3..z4 withcolor blue;
endfig;
end
`

function doCompile(code = placeholdercode) {
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


document.addEventListener("DOMContentLoaded", (event) => {
    var editor = CodeMirror.fromTextArea(
        document.getElementById('mpostcode'),
        {
            lineNumbers: true,
            mode: "metapost",
            theme: "default",
            value: placeholdercode
        });
    editor.on("change", (editor) => {
        doCompile(editor.getValue());
    });
});

