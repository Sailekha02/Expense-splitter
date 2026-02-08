import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  base: process.env.VITE_BASE_PATH || "/Expense-splitter",
=======
  base: process.env.VITE_BASE_PATH ||"git --version", 
>>>>>>> 6de20aecbc199b6b3e6e9c690d3c42e919f4fe6b
})
