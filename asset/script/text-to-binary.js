function convertToBinary() {
    const text = document.getElementById('textInput').value;
    let binary = '';

    for (let i = 0; i < text.length; i++) {
        const binaryChar = text[i].charCodeAt(0).toString(2).padStart(8, '0');
        binary += binaryChar + ' ';
    }

    document.getElementById('binaryOutput').value = binary.trim();
}

function convertToText() {
    const binary = document.getElementById('binaryOutput').value;
    const binaryArray = binary.split(' ');
    let text = '';

    for (let i = 0; i < binaryArray.length; i++) {
        if (binaryArray[i]) {
            const decimal = parseInt(binaryArray[i], 2);
            text += String.fromCharCode(decimal);
        }
    }

    document.getElementById('textInput').value = text;
}

function clearAll() {
    document.getElementById('textInput').value = '';
    document.getElementById('binaryOutput').value = '';
}