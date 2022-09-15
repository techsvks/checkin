import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

function Reader(props) {
    const video = useRef();
    const canvasRef = useRef();
    const [delayed, setDelayed] = useState(false);
    const [result, setResult] = useState();
    const [black, setBlack] = useState(false);

    useEffect(
        function () {
            if (result) {
                props.onScan(result.data);
                setBlack(true);
                setTimeout(() => {
                    setBlack(false);
                }, 500);
                setResult(null);
            }
        },
        [result]
    );

    useEffect(function () {
        const inter = setInterval(() => {
            requestAnimationFrame(tick);
        }, 200);
        return () => {
            clearInterval(inter);
        };
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
        if (delayed) return;
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
                // props.onScan(code.data);
                props.myFunc();
                // setTimeout(() => {
                //     requestAnimationFrame(tick);
                // }, 1000);
                setDelayed(true);
                setTimeout(() => {
                    setDelayed(false);
                }, 3000);
            } else {
                // setTimeout(() => {
                //     requestAnimationFrame(tick);
                // }, 10);
            }
            return;
        } else {
            // setTimeout(() => {
            //     requestAnimationFrame(tick);
            // }, 10);
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
