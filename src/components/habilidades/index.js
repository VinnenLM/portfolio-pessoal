import React from "react";
import './style.css'

export default function Habilidades() {
    return (
        <div className="habilidades" id="habilidades">

            <div className="title">
                <h2>Habilidades</h2>
            </div>

            <div className="icones">
                <i className="fab fa-php" title="PHP"></i>
                <i className="fab fa-laravel" title="Laravel"></i>
                <i className="fab fa-java" title="Java"></i>
                <i className="fab fa-js-square" title="Javascript"></i>
                <i className="fab fa-html5" title="HTML5"></i>
                <i className="fab fa-css3" title="CSS3"></i>
                <i className="fab fa-react" title="ReactJs"></i>
                <i className="fab fa-sass" title="Sass"></i>
                <i className="fab fa-bootstrap" title="Bootstrap"></i>
                <i className="fa-brands fa-node-js" title="NodeJs"></i>
            </div>

        </div>
    )
}