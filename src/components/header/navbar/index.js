import React from "react";
import { HashLink } from "react-router-hash-link";

export default function NavBar() {
    return (
        <nav>

            <h2 className="logo">Vinnen<span>LM</span></h2>

            <ul className="cabecalho-link">
                <li><HashLink to="/#home">Home</HashLink></li>
                <li><HashLink to="/#sobre">Sobre</HashLink></li>
                <li><HashLink to="/#habilidades">Habilidades</HashLink></li>
                <li><HashLink to="/#projetos">Projetos</HashLink></li>
                <li><HashLink to="/#contato">Contato</HashLink></li>
            </ul>

        </nav>
    )
}