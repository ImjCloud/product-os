import type { Metadata } from 'next';
import './styles.css';
export const metadata:Metadata={title:'Product OS | Product operations workspace',description:'A unified workspace for product feedback, prioritisation, delivery and performance.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
