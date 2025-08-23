import time
import requests
from bs4 import BeautifulSoup

URL = "https://escapefromtarkov.fandom.com"
response = requests.get(URL + "/wiki/Category:Item_icons", timeout=10)
soup = BeautifulSoup(response.text, 'html.parser')
#divs = soup.select('div.parent > a')
divs = soup.find_all('div', class_='CategoryTreeItem')
if not divs:
    exit()

for d in divs:
    suburl = URL + d.find('a')['href']

    s = BeautifulSoup(requests.get(suburl, timeout=10).text, 'html.parser')
    ul = s.find_all('li', class_='gallerybox')

    for li in ul:
        img_tag = li.find('div', class_='thumb').find('img')
        try:
            l = img_tag['data-src'] if 'data-src' in img_tag else img_tag['src']
            print(l)

            img = requests.get(l, timeout=10).content
            with open('tarkovIcons/' + img_tag['data-image-key'], 'wb') as handler:
                handler.write(img)
        except:
            time.sleep(1)
            continue
        time.sleep(1)
    time.sleep(10)

# there are next page links to handle these programmatically but currently its only these 2 pages so handle these manually
additional = ['https://escapefromtarkov.fandom.com/wiki/Category:Ammunition_icons?filefrom=TTPSTGZH.png#mw-category-media', 'https://escapefromtarkov.fandom.com/wiki/Category:Weapon_icons?filefrom=Saiga+12+NERFGUN+Trade.png#mw-category-media']
for link in additional:
    s = BeautifulSoup(requests.get(link).text, 'html.parser', timeout=10)
    ul = s.find_all('li', class_='gallerybox')

    for li in ul:
        img_tag = li.find('div', class_='thumb').find('img')
        try:
            l = img_tag['data-src'] if 'data-src' in img_tag else img_tag['src']
            print(l)

            img = requests.get(l, timeout=10).content
            with open('tarkovIcons/' + img_tag['data-image-key'], 'wb') as handler:
                handler.write(img)
        except:
            time.sleep(1)
            continue
        time.sleep(1)
    time.sleep(10)
