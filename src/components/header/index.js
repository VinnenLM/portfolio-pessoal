import React from "react";
import NavBar from "./navbar";
import './style.css'

export default function Header() {
    return (
        <header className="background" id="home">

            <NavBar />

            <div className="main">
                <h4>Olá, meu nome é</h4>
                <h1>Vinícius <span>Mendonça</span></h1>
                <h3>Desenvolvedor Web <span>Fullstack</span></h3>
            </div>

        </header>
    )
}