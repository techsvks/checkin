import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

const PAUSE_COUNT = 5;
let delayCount = 0;
function Reader(props) {
    const video = useRef();
    const canvasRef = useRef();
    const [result, setResult] = useState();
    const [black, setBlack] = useState(false);

    function shutter() {
        setBlack(true);
        setTimeout(() => {
            setBlack(false);
        }, 300);
    }

    useEffect(
        function () {
            if (result) {
                props.onScan(result.data);
                setResult(null);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [result]
    );

    useEffect(function () {
        const inter = setInterval(() => {
            requestAnimationFrame(tick);
        }, 200);
        return () => {
            clearInterval(inter);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
        function () {
            navigator.mediaDevices
                .getUserMedia({ video: { facingMode: "environment" } })
                .then(function (stream) {
                    console.log(stream);
                    try {
                        video.current.srcObject = stream;
                        video.current.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
                        video.current.play();
                    } catch {}
                });
        },
        [video, canvasRef]
    );

    function tick() {
        if (props.periodic())
        {
            shutter();
        }
        if (--delayCount > 0) return;
        if (video.current.readyState === video.current.HAVE_ENOUGH_DATA) {
            canvasRef.current.height = video.current.videoHeight;
            canvasRef.current.width = video.current.videoWidth;

            var canvas = canvasRef.current.getContext("2d");

            canvas.drawImage(
                video.current,
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );
            var imageData = canvas.getImageData(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );
            var code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            if (code) {
                console.log(code.data);
                setResult({ data: code.data, time: new Date() });
                delayCount = PAUSE_COUNT;
            } 
            return;
        } 
    }

    return (
        <div>
            <video
                style={{
                    height: "100%",
                    width: "auto",
                    filter: black ? "brightness(0%)" : "brightness(100%)",
                }}
                ref={video}
            ></video>
            <canvas ref={canvasRef} hidden></canvas>
        </div>
    );
}

export default Reader;
