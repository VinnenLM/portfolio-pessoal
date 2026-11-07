import React from "react";
import Experiencia from "../../components/experiencia";
import Footer from "../../components/footer";
import Habilidades from "../../components/habilidades";
import Header from "../../components/header";
import Projetos from "../../components/projetos";
import Sobre from "../../components/sobre";
import './style.css'

export default function Home() {
    return (
        <>
            <Header />
            <Sobre />
            <Habilidades />
            <Experiencia />
            <Projetos />
            <Footer />
        </>
    )
}