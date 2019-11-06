"""
Helper script that do dull jobs
"""
import re, urllib.request

def main():
    fonts_map = download_all_fonts(filename="fonts.css", prefix="fonts_")
    remap_fonts(filename="fonts.css", remap_filename="fonts_local.css", fonts_map=fonts_map)
    pass


def download_all_fonts(filename, prefix):
    with open(filename, "r", encoding='utf-8') as f:
        content = f.read()
    urls = re.findall(r"url\([^\s]*\)", content)
    fonts_map = {}
    for e in urls:
        url = e[4:-1]
        if url in fonts_map:
            continue
        suffix = re.findall(r"\.[^\.]*$", url)[0]
        font_local_name = "./" + prefix + len(fonts_map).__str__() + suffix
        with open(font_local_name, "wb") as f:
            f.write(urllib.request.urlopen(url).read())
        fonts_map[url] = font_local_name
        print("\"%s\" downloaded as \"%s\"" % (url, font_local_name))
    return fonts_map

def remap_fonts(filename, remap_filename, fonts_map):
    with open(filename, "r", encoding='utf-8') as f:
        content = f.read()
    for url in fonts_map:
        content = content.replace(url, fonts_map[url])
    with open(remap_filename, "w", encoding='utf-8') as f:
        f.write(content)
    return content

if __name__ == "__main__":
    main()
