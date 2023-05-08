/**
 * @returns input if good
 * @throws {Error} with info message'}
 * @param {String} input - input to sanitize
 * @param type - one of name, username, password, custom
 * @param {Object} opts optional setings with sig { min_length, max_length, regex }
 */

function base64ToBuffer(base64Images) {
    return base64Images.map((base64) => {
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    });
  }

function escapeHtml(unsafe) {
    if (!unsafe || unsafe.length === 0) return unsafe
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}
/**
 * filterInput - direct copy from fron-end with Dompurify removed
 * @returns input if good
 * @throws {Error} with user-friendly message'}
 * @param {String} input - input to sanitize
 * @param type - one of 'name', 'username', 'password', 'html', 'custom'
 * @param {Object} opts optional setings with sig { min_length, max_length, regex }
 */
function filterInput(
    input = '',
    type = 'custom',
    { min_length: min = 1, max_length: max = 60000, regex: reg = null, identifier = null } = {}
) {
    identifier = identifier || `input {${type}}`
    input = input.toString().trim()
    let regexes = {
        username: RegExp(`^[_a-zA-Z0-9]{${min},${max}}$`),
        password: RegExp(`^\\S{${min},${max}}$`),
        name: RegExp(`^.{${min},${max}}$`),
        number: RegExp(`^-?([1-9]\\d{0,7}|0)(\\.\\d+)?$|^100000000$`),
        natural: RegExp(`^\\d{1,8}(\\.\\d+)?$`)
    }
    if (!reg) {
        reg = regexes[type]
    }
    if (reg) {
        if (!reg.test(input)) {
            throw Error(
                `${identifier} No coincide: ${reg} (rango de caracteres entre ${min} y ${max})`
            )
        }
    }
    if (type === 'number') {
        let number = Number(input);
        if (number > 100000000 || number < -100000000 || !Number.isInteger(number)) {
            throw Error(`${identifier} debe ser un número entero entre -100000000 y 100000000`);
        }
        if (number >= 0 && number < 100) {
            throw Error(`${identifier} el número debe ser mayor igual que 100`);
        }
        if (number < 0 && number > -100) {
            throw Error(`${identifier} el número debe ser menor igual que -100`);
        }
    }
    else if (type === 'natural') {
        let number = Number(input);
        if (number <= 0 || number >= 100000000) {
            throw Error(`${identifier} debe ser un número 0 y 100000000`);
        }
    }
    else {
        if (input.length > max || input.length < min) {
            throw Error(`${identifier} minimo de caracteres ${min} , máximo de ${max} caracteres`)
        }
        if (input.includes('\n'))
            // long text, strip of multiple newlines etc
            input = input.replace(/\n+/g, '\n').trim()
    }
    return input
}
function getRandomProfileUrl() {
    //geneartes random pic in img
    let imgs = [
        'animals-1298747.svg',
        'bunny-155674.svg',
        'cat-154642.svg',
        'giraffe-2521453.svg',
        'iron-man-3829039.svg',
        'ironman-4454663.svg',
        'lion-2521451.svg',
        'man-1351317.svg',
        'pumpkin-1640465.svg',
        'rat-152162.svg',
        'sherlock-3828991.svg',
        'spider-man-4639214.svg',
        'spiderman-5247581.svg',
        'thor-3831290.svg',
        'tiger-308768.svg',
        'whale-36828.svg',
    ]
    let img = imgs[Math.floor(Math.random() * imgs.length)]
    return `/img/${img}`
}

// Hot-fix, better mechanism later on
function ensureCorrectImage(url) {
    if (!url || !url.startsWith('/img')) {
        return getRandomProfileUrl()
    }
    return url
}

exports.filterInput = filterInput
exports.ensureCorrectImage = ensureCorrectImage
exports.getRandomProfileUrl = getRandomProfileUrl
