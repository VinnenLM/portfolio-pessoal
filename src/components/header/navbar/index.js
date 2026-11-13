import React from "react";
import { HashLink } from "react-router-hash-link";

export default function NavBar() {
    return (
        <nav className="topo">
            <div className="topo-inner">
                <HashLink to="/#home" className="logo">Vinnen<em>LM</em></HashLink>

                <ul className="cabecalho-link">
                    <li><HashLink to="/#home">Home</HashLink></li>
                    <li><HashLink to="/#sobre">Sobre</HashLink></li>
                    <li><HashLink to="/#habilidades">Habilidades</HashLink></li>
                    <li><HashLink to="/#experiencia">Experiência</HashLink></li>
                    <li><HashLink to="/#projetos">Projetos</HashLink></li>
                    <li><HashLink to="/#contato">Contato</HashLink></li>
                </ul>
            </div>
        </nav>
    )
}
