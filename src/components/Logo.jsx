
export default function Logo({ className = "", showText = false, textClassName = "text-xl font-bold text-white ml-3" }) {
    const logoUrl = "https://res.cloudinary.com/di2c9rec3/image/upload/v1770443502/logo-nimbus_lem0wf.png";

    return (
        <div className={`flex items-center ${showText ? '' : 'justify-center'}`}>
            <img
                src={logoUrl}
                alt="Nimbus Cloud Logo"
                className={`${className} object-contain`} // object-contain ensures aspect ratio is preserved
            />
            {showText && <span className={textClassName}>NIMBUS CLOUD</span>}
        </div>
    );
}
