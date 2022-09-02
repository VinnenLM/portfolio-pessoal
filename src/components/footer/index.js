import React from "react";
import './style.css'

export default function Footer() {
    return (
        <footer id="contato">

            <div className="title">
                <h2>Vinícius Mendonça</h2>
            </div>

            <p>Para mais informações, acesse alguma das minhas redes sociais</p>

            <div className="redes">
                <a href="https://www.facebook.com/V1n1c1u5Mendonca/" target="_blank" rel="noreferrer"><i className="fab fa-facebook-f"></i></a>
                <a href="https://www.instagram.com/vinnenmend/" target="_blank" rel="noreferrer"><i className="fab fa-instagram"></i></a>
                <a href="https://github.com/VinnenLM" target="_blank" rel="noreferrer"><i className="fab fa-github"></i></a>
                <a href="https://www.linkedin.com/in/vinicius-lima-mendonca/" target="_blank" rel="noreferrer"><i className="fab fa-linkedin"></i></a>
            </div>

            <p className="end">CopyRight By Vinícius Mendonça</p>

        </footer>
    )
}