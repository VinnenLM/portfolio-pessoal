import React from "react";
import NavBar from "../../components/header/navbar";

export default function Pagina404() {
    return (
        <>
            <NavBar />
            <div className="background-error">
                <div className="main">
                    <h1>Erro <span>404</span></h1>
                    <h3>Página <span>Não Encontada!</span></h3>
                </div>
            </div>
        </>
    )
}