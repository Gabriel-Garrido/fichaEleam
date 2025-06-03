import React from "react";
import Input from "../../components/Input";
import Button from "../../components/Button";

function Register() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Registrarse</h1>
      <form className="bg-white p-6 rounded shadow-md w-80">
        <Input type="text" placeholder="Nombre" className="mb-4 w-full" />
        <Input
          type="email"
          placeholder="Correo Electrónico"
          className="mb-4 w-full"
        />
        <Input
          type="password"
          placeholder="Contraseña"
          className="mb-4 w-full"
        />
        <Button className="bg-green-500 text-white w-full">Registrarse</Button>
      </form>
    </div>
  );
}

export default Register;
