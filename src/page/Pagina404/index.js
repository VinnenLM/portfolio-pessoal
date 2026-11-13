import React from "react";
import NavBar from "../../components/header/navbar";

export default function Pagina404() {
    return (
        <>
            <NavBar />
            <div className="background-error">
                <div className="main">
                    <h1>Erro <span className="destaque">404</span></h1>
                    <h3>Página <span className="destaque">Não Encontrada!</span></h3>
                </div>
            </div>
        </>
    )
}