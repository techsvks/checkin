export const sleep = (time) => {
   return new Promise((resolve) => setTimeout(resolve, Math.ceil(time * 1000)));
};

interface String
{
    format: () => String;
}

// eslint-disable-next-line no-extend-native
String.prototype.format = function() {
    let formatted = this;
    for (let i = 0; i < arguments.length; i++) {
        let regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
}

export const toastProp = {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined
}
