from __future__ import annotations

from pathlib import Path
from textwrap import wrap


PAGE_WIDTH = 841.89
PAGE_HEIGHT = 595.28
OUTPUT_PATH = Path("aula_fisiologia_magia_trabalho_de_parto.pdf")

TITLE = "Aula: A Fisiologia e a Magia do Trabalho de Parto"
SUBTITLE = "Presença, educação e cuidado para viver o parto com mais segurança."

# Paleta baseada em www.brunagumz.com.br/css/styles.css
BG = (1.0, 0.969, 0.973)  # #fff7f8
BG_SOFT = (0.973, 0.914, 0.937)  # #f8e9ef
PANEL = (1.0, 1.0, 1.0)  # #ffffff
TEXT = (0.239, 0.141, 0.188)  # #3d2430
MUTED = (0.557, 0.424, 0.471)  # #8e6c78
PRIMARY = (0.725, 0.310, 0.451)  # #b94f73
PRIMARY_DARK = (0.624, 0.247, 0.380)  # #9f3f61
PRIMARY_SOFT = (1.0, 0.945, 0.973)  # #fff1f5
ACCENT = (0.725, 0.612, 0.910)  # #b99ce8
ACCENT_SOFT = (0.953, 0.922, 1.0)  # #f3ebff
LINE = (0.925, 0.835, 0.867)

SLIDES = [
    {
        "heading": "1. Introdução: O Grande Maquinário do Parto",
        "items": [
            (
                "p",
                "O trabalho de parto funciona como um grande e perfeito maquinário: "
                "ele só entra em pleno funcionamento quando todas as engrenagens estão "
                "em harmonia. Na obstetrícia, chamamos essas engrenagens de Fatores do "
                "Trabalho de Parto. Existe um equilíbrio sutil e necessário entre eles, "
                "e o ambiente ao redor da gestante interfere diretamente em cada um.",
            ),
        ],
    },
    {
        "heading": "2. Os 5 Fatores do Trabalho de Parto (Os 5 Ps)",
        "items": [
            (
                "p",
                "Para que o parto aconteça em equilíbrio, dependemos de cinco elementos "
                "fundamentais:",
            ),
            (
                "b",
                "Passageiro: O bebê (seu tamanho, sua posição e sua jornada).",
            ),
            (
                "b",
                "Passagem: A pelve materna (o trajeto que determina o caminho do parto).",
            ),
            (
                "b",
                "Poder: As contrações uterinas (a força do motor, que precisa ser boa, "
                "intensa e rítmica).",
            ),
            (
                "b",
                "Posição materna: O movimento e as posições da mulher que ajudam a abrir "
                "espaço na pelve.",
            ),
            (
                "b",
                "Psique materna: A mente e o estado emocional da gestante.",
            ),
        ],
    },
    {
        "heading": "3. O Início de Tudo: Maturidade Fetal e a Dança Hormonal",
        "items": [
            ("p", "O parto não começa por acaso; quem dá o sinal verde é o bebê."),
            (
                "b",
                "A Maturidade Fetal: Quando o sistema respiratório do bebê está pronto, "
                "seus reflexos estão maduros e sua fisiologia está completa (inclusive "
                "fazendo xixi e mecônio), o cérebro dele envia um sinal.",
            ),
            (
                "b",
                "O Sinal do Bebê: O cérebro fetal libera substâncias na corrente "
                "sanguínea que sinalizam o início do processo.",
            ),
            (
                "b",
                "A Resposta do Útero: No final da gestação, o próprio útero começa a "
                "produzir prostaglandina, responsável pela primeira fase (fase latente).",
            ),
            (
                "b",
                "O Feedback Positivo: As contrações iniciais começam a afinar o colo do "
                "útero. Esse estímulo envia um feedback sensorial direto para o cérebro "
                "da gestante, que responde liberando ocitocina.",
            ),
            (
                "b",
                "Conclusão: As contrações são o resultado dessa conformidade perfeita "
                "entre a maturidade do bebê e a ação hormonal da mãe.",
            ),
        ],
    },
    {
        "heading": "4. O que acontece no Útero? (Dilatação e Apagamento)",
        "items": [
            (
                "p",
                "Durante o trabalho de parto, o colo do útero passa por grandes "
                "transformações de textura e espessura:",
            ),
            (
                "b",
                "O Colo Inicial: Antes de mudar, o colo do útero tem cerca de 3 cm de "
                "espessura. No toque vaginal, a consistência de um colo grosso e fechado "
                "se assemelha à ponta do nariz (nem muito duro, nem muito mole).",
            ),
            (
                "b",
                "O Colo em Trabalho de Parto: À medida que o parto evolui, ele vai "
                "afinando (apagamento) e abrindo (dilatação). A consistência de um colo "
                "que está se preparando para dilatar se assemelha à pele macia entre os "
                "dedos da mão.",
            ),
            (
                "note",
                "Mensagem-chave: Trabalho de parto não é apenas dilatação. É, acima de "
                "tudo, a relação de encaixe e descida do bebê através da pelve. É uma "
                "verdadeira viagem espacial e anatômica.",
            ),
        ],
    },
    {
        "heading": "5. O Mecanismo do Parto: A Viagem do Bebê",
        "items": [
            (
                "p",
                'O nascimento não é um "tobogã" onde o bebê simplesmente escorrega. '
                "É um processo ativo de ajuste, modelagem e paciência.",
            ),
            ("h", "Passo 1: O Encaixe (Insinuação)"),
            (
                "b",
                "É o momento em que o bebê deixa de estar flutuando acima da pelve e "
                "entra no canal anatômico.",
            ),
            (
                "b",
                'Muitas vezes, em consultas de pré-natal, ouve-se que o bebê "já '
                'encaixou", mas o encaixe real e definitivo costuma acontecer de fato '
                "durante as contrações do trabalho de parto.",
            ),
            (
                "b",
                'Como identificar? Pela palpação obstétrica ou pela visível diminuição '
                'da altura uterina (a barriga "baixa").',
            ),
            ("h", "Passo 2: A Descida e Rotação"),
            (
                "b",
                "Para descer, o bebê precisa se ajeitar. O caminho fica muito mais fácil "
                "quando ele faz a flexão (encosta o queixo no peito).",
            ),
            (
                "b",
                "À medida que desce, ele vai rodando devagar até ficar em posição "
                "anterior (com as costinhas voltadas para a barriga da mãe).",
            ),
            ("h", "Passo 3: O Desprendimento (O Nascimento)"),
            (
                "b",
                "A cabeça chega ao canal vaginal e começa a pressionar o períneo "
                "suavemente, avançando e retornando a cada contração, até se desprender "
                "por completo.",
            ),
            (
                "b",
                "Em seguida, nascem o ombro anterior (da frente), o ombro posterior "
                "(de trás) e, finalmente, o corpo todo. O bebê nasceu!",
            ),
        ],
    },
    {
        "heading": "6. Conclusão: A Mente a Favor do Parto",
        "items": [
            (
                "p",
                "Nossa mente ocidental e a sociedade estão cheias de medos, mitos e "
                "dúvidas implantados sobre o nascimento. Porém, como a Psique é um dos "
                "5 fatores cruciais do parto, o medo excessivo pode tensionar o corpo e "
                "travar a liberação de ocitocina.",
            ),
            (
                "p",
                "O nosso maior papel na preparação para o parto é trabalhar a mente a "
                "favor do processo fisiológico, e não contra ele. Conhecer essa "
                "engrenagem perfeita traz segurança e devolve o protagonismo à natureza "
                "do corpo.",
            ),
        ],
    },
]


def escaped_pdf_text(text: str) -> bytes:
    encoded = text.encode("cp1252", errors="replace")
    encoded = encoded.replace(b"\\", b"\\\\")
    encoded = encoded.replace(b"(", b"\\(").replace(b")", b"\\)")
    encoded = encoded.replace(b"\r", b" ").replace(b"\n", b" ")
    return b"(" + encoded + b")"


def rect(x: float, y: float, width: float, height: float, color: tuple[float, float, float]) -> bytes:
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {y:.2f} {width:.2f} {height:.2f} re f\n".encode()


def rounded_rect(
    x: float,
    y: float,
    width: float,
    height: float,
    radius: float,
    fill: tuple[float, float, float],
    stroke: tuple[float, float, float] | None = None,
    stroke_width: float = 1.0,
) -> bytes:
    k = 0.5522847498
    r = min(radius, width / 2, height / 2)
    commands = [
        f"{x + r:.2f} {y:.2f} m",
        f"{x + width - r:.2f} {y:.2f} l",
        f"{x + width - r + k * r:.2f} {y:.2f} {x + width:.2f} {y + r - k * r:.2f} {x + width:.2f} {y + r:.2f} c",
        f"{x + width:.2f} {y + height - r:.2f} l",
        f"{x + width:.2f} {y + height - r + k * r:.2f} {x + width - r + k * r:.2f} {y + height:.2f} {x + width - r:.2f} {y + height:.2f} c",
        f"{x + r:.2f} {y + height:.2f} l",
        f"{x + r - k * r:.2f} {y + height:.2f} {x:.2f} {y + height - r + k * r:.2f} {x:.2f} {y + height - r:.2f} c",
        f"{x:.2f} {y + r:.2f} l",
        f"{x:.2f} {y + r - k * r:.2f} {x + r - k * r:.2f} {y:.2f} {x + r:.2f} {y:.2f} c",
        "h",
    ]
    fr, fg, fb = fill
    prefix = f"{fr:.3f} {fg:.3f} {fb:.3f} rg "
    if stroke:
        sr, sg, sb = stroke
        prefix += f"{sr:.3f} {sg:.3f} {sb:.3f} RG {stroke_width:.2f} w "
        op = "B"
    else:
        op = "f"
    return (prefix + " ".join(commands) + f" {op}\n").encode()


def circle(cx: float, cy: float, radius: float, color: tuple[float, float, float]) -> bytes:
    k = 0.5522847498
    r, g, b = color
    x0, x1 = cx - radius, cx + radius
    y0, y1 = cy - radius, cy + radius
    c = radius * k
    return (
        f"{r:.3f} {g:.3f} {b:.3f} rg "
        f"{cx:.2f} {y1:.2f} m "
        f"{cx + c:.2f} {y1:.2f} {x1:.2f} {cy + c:.2f} {x1:.2f} {cy:.2f} c "
        f"{x1:.2f} {cy - c:.2f} {cx + c:.2f} {y0:.2f} {cx:.2f} {y0:.2f} c "
        f"{cx - c:.2f} {y0:.2f} {x0:.2f} {cy - c:.2f} {x0:.2f} {cy:.2f} c "
        f"{x0:.2f} {cy + c:.2f} {cx - c:.2f} {y1:.2f} {cx:.2f} {y1:.2f} c h f\n"
    ).encode()


def stroke_line(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    color: tuple[float, float, float],
    width: float = 1.0,
) -> bytes:
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} RG {width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n".encode()


def text_line(
    x: float,
    y: float,
    text: str,
    size: float,
    font: str = "F1",
    color: tuple[float, float, float] = TEXT,
) -> bytes:
    r, g, b = color
    return (
        f"BT /{font} {size:.2f} Tf {r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {y:.2f} Td ".encode()
        + escaped_pdf_text(text)
        + b" Tj ET\n"
    )


def max_chars(width: float, font_size: float, bold: bool = False) -> int:
    factor = 0.49 if not bold else 0.52
    return max(24, int(width / (font_size * factor)))


def wrapped_lines(item_type: str, text: str, width: float, font_size: float) -> list[tuple[str, str, float]]:
    bold = item_type in {"h", "note"}
    available = max_chars(width, font_size, bold=bold)

    if item_type == "b":
        chunks = wrap(text, width=max(20, available - 3), break_long_words=False)
        return [("F1", "• " + chunks[0], font_size)] + [
            ("F1", "  " + chunk, font_size) for chunk in chunks[1:]
        ]

    if item_type == "h":
        chunks = wrap(text, width=available, break_long_words=False)
        return [("F2", chunk, font_size + 1.0) for chunk in chunks]

    if item_type == "note":
        chunks = wrap(text, width=max(20, available - 2), break_long_words=False)
        return [("F2", chunks[0], font_size)] + [("F2", chunk, font_size) for chunk in chunks[1:]]

    chunks = wrap(text, width=available, break_long_words=False)
    return [("F1", chunk, font_size) for chunk in chunks]


def materialize_lines(
    items: list[tuple[str, str]], width: float, font_size: float
) -> list[tuple[str, str, float, float]]:
    lines: list[tuple[str, str, float, float]] = []
    for item_type, text in items:
        if lines:
            lines.append(("space", "", font_size, font_size * 0.45))
        for font, line, size in wrapped_lines(item_type, text, width, font_size):
            lines.append((font, line, size, size * 1.24))
    return lines


def choose_layout(
    items: list[tuple[str, str]], available_height: float
) -> tuple[int, float, list[tuple[str, str, float, float]]]:
    one_column_width = PAGE_WIDTH - 120
    for size in (18.0, 17.0, 16.0, 15.0, 14.0, 13.0):
        lines = materialize_lines(items, one_column_width, size)
        if sum(line_height for _, _, _, line_height in lines) <= available_height:
            return 1, size, lines

    two_column_width = (PAGE_WIDTH - 145) / 2
    for size in (14.0, 13.5, 13.0, 12.5, 12.0, 11.5):
        lines = materialize_lines(items, two_column_width, size)
        total_height = sum(line_height for _, _, _, line_height in lines)
        if total_height <= available_height * 2:
            return 2, size, lines

    return 2, 11.0, materialize_lines(items, two_column_width, 11.0)


def slide_stream(slide: dict[str, object], page_number: int, total_pages: int) -> bytes:
    is_first_page = page_number == 1
    stream = bytearray()
    stream += rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG)
    stream += circle(84, PAGE_HEIGHT - 68, 145, BG_SOFT)
    stream += circle(PAGE_WIDTH - 22, PAGE_HEIGHT - 42, 128, ACCENT_SOFT)
    stream += circle(PAGE_WIDTH - 94, 92, 92, PRIMARY_SOFT)
    stream += rounded_rect(34, 34, PAGE_WIDTH - 68, PAGE_HEIGHT - 68, 24, PANEL, LINE, 1.0)

    if is_first_page:
        stream += rounded_rect(58, PAGE_HEIGHT - 160, 84, 52, 18, PRIMARY, None)
        stream += text_line(79, PAGE_HEIGHT - 141, "01", 25, "F2", (1.0, 1.0, 1.0))
        stream += rounded_rect(158, PAGE_HEIGHT - 71, 78, 27, 13.5, PRIMARY_SOFT, LINE, 0.8)
        stream += text_line(176, PAGE_HEIGHT - 62, "Aula", 11, "F2", PRIMARY_DARK)
        stream += text_line(158, PAGE_HEIGHT - 97, "Aula: A Fisiologia e a Magia", 29, "F2", PRIMARY)
        stream += text_line(158, PAGE_HEIGHT - 134, "do Trabalho de Parto", 31, "F2", PRIMARY)
        stream += text_line(158, PAGE_HEIGHT - 162, SUBTITLE, 14, "F1", MUTED)
        stream += circle(PAGE_WIDTH - 75, PAGE_HEIGHT - 103, 8, ACCENT)
        stream += stroke_line(60, PAGE_HEIGHT - 190, PAGE_WIDTH - 60, PAGE_HEIGHT - 190, LINE, 1.0)
        stream += text_line(60, PAGE_HEIGHT - 222, str(slide["heading"]), 22, "F2", PRIMARY_DARK)
        start_y = PAGE_HEIGHT - 258
    else:
        stream += rounded_rect(58, PAGE_HEIGHT - 128, 84, 52, 18, PRIMARY, None)
        stream += text_line(79, PAGE_HEIGHT - 109, f"{page_number:02d}", 25, "F2", (1.0, 1.0, 1.0))
        stream += rounded_rect(158, PAGE_HEIGHT - 88, 190, 27, 13.5, PRIMARY_SOFT, LINE, 0.8)
        stream += text_line(176, PAGE_HEIGHT - 79, "Educação perinatal", 11, "F2", PRIMARY_DARK)
        stream += text_line(158, PAGE_HEIGHT - 118, str(slide["heading"]), 24, "F2", PRIMARY)
        stream += circle(PAGE_WIDTH - 75, PAGE_HEIGHT - 86, 8, ACCENT)
        stream += stroke_line(60, PAGE_HEIGHT - 151, PAGE_WIDTH - 60, PAGE_HEIGHT - 151, LINE, 1.0)
        start_y = PAGE_HEIGHT - 185

    bottom_y = 77
    columns, _, lines = choose_layout(slide["items"], start_y - bottom_y)
    margin_x = 60
    gap = 25
    column_width = PAGE_WIDTH - 120 if columns == 1 else (PAGE_WIDTH - 120 - gap) / 2
    x_positions = [margin_x, margin_x + column_width + gap]

    col = 0
    y = start_y
    for font, line, size, line_height in lines:
        if y - line_height < bottom_y and columns == 2 and col == 0:
            col = 1
            y = start_y
        if font != "space":
            color = TEXT if font == "F1" else PRIMARY_DARK
            stream += text_line(x_positions[col], y, line, size, font, color)
        y -= line_height

    stream += stroke_line(60, 60, PAGE_WIDTH - 60, 60, LINE, 1.0)
    stream += text_line(60, 43, f"Página {page_number} de {total_pages}", 10.5, "F1", MUTED)
    stream += text_line(PAGE_WIDTH - 226, 43, "Doula Bruna Gumz", 10.5, "F2", PRIMARY)
    return bytes(stream)


def pdf_object(object_id: int, payload: bytes) -> bytes:
    return f"{object_id} 0 obj\n".encode() + payload + b"\nendobj\n"


def build_pdf() -> bytes:
    objects: list[bytes] = []
    page_count = len(SLIDES)
    page_ids = [5 + index * 2 for index in range(page_count)]
    content_ids = [6 + index * 2 for index in range(page_count)]

    objects.append(pdf_object(1, b"<< /Type /Catalog /Pages 2 0 R >>"))
    kids = b" ".join(f"{page_id} 0 R".encode() for page_id in page_ids)
    objects.append(pdf_object(2, b"<< /Type /Pages /Kids [" + kids + f"] /Count {page_count} >>".encode()))
    objects.append(pdf_object(3, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"))
    objects.append(pdf_object(4, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"))

    for index, slide in enumerate(SLIDES):
        page_id = page_ids[index]
        content_id = content_ids[index]
        content = slide_stream(slide, index + 1, page_count)
        page_payload = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH:.2f} {PAGE_HEIGHT:.2f}] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode()
        content_payload = f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"endstream"
        objects.append(pdf_object(page_id, page_payload))
        objects.append(pdf_object(content_id, content_payload))

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj

    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode()
    return bytes(pdf)


def main() -> None:
    OUTPUT_PATH.write_bytes(build_pdf())
    print(f"PDF criado: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
