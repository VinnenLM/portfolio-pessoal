import React from "react";
import { HashLink } from "react-router-hash-link";

export default function NavBar() {
    return (
        <nav className="topo">
            <div className="topo-inner">
                <HashLink to="/#home" className="logo">
                    <img className="logo-marca" src={`${process.env.PUBLIC_URL}/logo.svg`} alt="" />
                    <span>Vinnen<em>LM</em></span>
                </HashLink>

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
