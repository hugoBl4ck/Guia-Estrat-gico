import os
import PyPDF2

directory = "c:/Users/Hugo/Documents/Guia Estratégico/Concurso AVALIA - Milena"
output_dir = os.path.join(directory, "extracted_text")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for root, _, files in os.walk(directory):
    if root == output_dir:
        continue
    for file in files:
        if file.endswith(".pdf"):
            pdf_path = os.path.join(root, file)
            txt_path = os.path.join(output_dir, file.replace(".pdf", ".txt"))
            try:
                with open(pdf_path, "rb") as pdf_file:
                    reader = PyPDF2.PdfReader(pdf_file)
                    text = ""
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                with open(txt_path, "w", encoding="utf-8") as txt_file:
                    txt_file.write(text)
                print(f"Extracted {file}")
            except Exception as e:
                print(f"Error extracting {file}: {e}")
