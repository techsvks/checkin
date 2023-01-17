import React from "react";
export const ToPrint = React.forwardRef((props, ref) => {
    return (
        <div
            className="toPrint"
            ref={ref}
            style={{
                width: "auto",
                // position: "absolute",
                // // top: "-100%",
                // zIndex: "-100",
            }}
        >
            {props.children}
        </div>
    );
});

export default ToPrint;
