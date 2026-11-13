import React from "react";
import { HashLink } from "react-router-hash-link";
import NavBar from "./navbar";
import './style.css'

export default function Header() {
    return (
        <>
            <NavBar />

            <header className="hero" id="home">
                <div className="hero-conteudo">
                    <p className="saudacao">Olá, meu nome é</p>
                    <h1>Vinícius <span className="destaque">Mendonça</span></h1>
                    <h3>Desenvolvedor Backend <span className="destaque">Node.js e NestJS</span></h3>

                    <div className="cta">
                        <HashLink className="btn btn-primary" to="/#projetos">
                            Ver projetos <i className="fa-solid fa-arrow-right"></i>
                        </HashLink>
                        <HashLink className="btn btn-ghost" to="/#contato">Entrar em contato</HashLink>
                    </div>
                </div>
            </header>
        </>
    )
}
