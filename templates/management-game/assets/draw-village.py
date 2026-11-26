# SPDX-License-Identifier: Apache-2.0
"""Draw the management starter's original pixel art. Run with Python 3 and Pillow."""

from math import cos, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
W, H = 480, 270
# All coordinates below are source pixels. The game uses a 2x logical stage.
PLOTS = [(127, 180), (253, 157), (370, 174)]


def rounded(points):
    return [(round(x), round(y)) for x, y in points]


def polygon(draw, points, color):
    draw.polygon(rounded(points), fill=color)


def stroke(draw, points, color, width=1):
    draw.line(rounded(points), fill=color, width=width)


def ellipse(draw, x, y, rx, ry, color):
    draw.ellipse((round(x-rx), round(y-ry), round(x+rx), round(y+ry)), fill=color)


def ridge(x, base, phase, scale):
    return base + scale * (0.52*sin(x/47 + phase) + 0.32*cos(x/31-phase)
                           + 0.16*sin(x/13 + 2*phase))


def north_bank(x):
    return 80 + 13*cos((x-46)/48) - 0.073*x + 5*sin(x/25)


def south_bank(x):
    return north_bank(x) + 43 - x*0.052 + 7*sin((x+64)/57)


def cloud(draw, x, y, size):
    for dx, dy, width in [(0, 1, 22), (9, 0, 18), (-6, 2, 20), (18, 2, 10)]:
        ellipse(draw, x+dx*size, y+dy*size, width*size, 2*size, '#f8e8ba')


def tree(draw, x, y, size, palette, seed):
    """Deciduous tree anchored at ground level; light enters from the upper left."""
    rng = Random(seed)
    def local(points):
        return [(x+px*size, y+py*size) for px, py in points]
    shadow, dark, middle, sunlit = palette
    ellipse(draw, x+3*size, y, 9*size, 2*size, shadow)
    polygon(draw, local([(-1, 0), (1, -1), (2, -16), (0, -16)]), '#6b5e42')
    stroke(draw, local([(0, -6), (-4, -13), (-6, -14)]), '#796744')
    for dx, dy, radius in [(-6,-12,6), (4,-13,7), (-4,-18,7), (3,-20,6), (-1,-23,5)]:
        ellipse(draw, x+dx*size, y+dy*size, radius*size, radius*size*0.74, dark)
        ellipse(draw, x+(dx-1)*size, y+(dy-2)*size, radius*size*0.88, radius*size*0.57, middle)
        for _ in range(7):
            lx, ly = dx+rng.uniform(-radius*0.8, radius*0.5), dy+rng.uniform(-radius*0.5, 0)
            stroke(draw, local([(lx,ly), (lx+2,ly), (lx+3,ly-1)]), sunlit)


def pine(draw, x, y, size, dark, mid, lit):
    def shape(points):
        return [(x+px*size,y+py*size) for px,py in points]
    stroke(draw, shape([(0,0),(0,-19)]), '#645d44', max(1, round(size)))
    for dy, width in [(-4, 7),(-9, 6),(-14, 4)]:
        polygon(draw,shape([(-width,dy),(-2,dy-6),(0,dy-10),(width,dy-1),(2,dy+2)]),dark)
        polygon(draw,shape([(-width,dy),(-1,dy-9),(-1,dy-2),(2,dy-1),(-3,dy+1)]),mid)
        stroke(draw,shape([(-width+1,dy),(-4,dy-2),(-3,dy-4)]),lit)


def distant_roof(draw, x, y, scale):
    def points(values):
        return [(x+dx*scale,y+dy*scale) for dx,dy in values]
    polygon(draw,points([(-11,0),(9,-2),(9,-10),(-10,-8)]),'#e0c69b')
    polygon(draw,points([(4,0),(9,-2),(9,-10),(4,-8)]),'#b3a482')
    polygon(draw,points([(-14,-7),(-9,-11),(-6,-16),(7,-17),(9,-13),(13,-11),(14,-12),
                         (13,-9),(-11,-5)]),'#556967')
    stroke(draw,points([(-12,-7),(11,-11)]),'#70847a')
    stroke(draw,points([(-7,-16),(7,-17)]),'#899083')
    polygon(draw,points([(-7,-1),(-5,-1),(-5,-6),(-7,-6)]),'#7d7157')


def meadow(draw, rng):
    # Broad slopes are painted first so that the small motifs follow the land.
    polygon(draw,[(0,south_bank(0)),*[(x,south_bank(x)) for x in range(W+1)],(W,H),(0,H)],'#bfc28a')
    for base, amplitude, color in [(159,8,'#c7c58e'), (196,10,'#b3b97e'),(227,13,'#a7ad74'),
                                  (249,8,'#96a36e')]:
        edge=[(x,base+amplitude*sin(x/46+base)+4*cos(x/19)) for x in range(0,W+5,4)]
        polygon(draw,[*edge,(W,H),(0,H)],color)
    # Small, broken brush marks suggest grass; keep the plots calm and readable.
    for _ in range(5100):
        x, y = rng.randrange(W), rng.randrange(62,H)
        if y <= south_bank(x)+2:
            continue
        near_plot = any(((x-px)/43)**2+((y-py+12)/15)**2<1 for px,py in PLOTS)
        if near_plot and rng.randrange(6):
            continue
        shade = rng.choice(('#b6ba85','#c8c890','#c7c78f','#abb17b','#d0cd94','#a5ad78'))
        length = rng.choice((1,2,2,3,4,7))
        stroke(draw,[(x,y),(x+length,y)],shade)
        if rng.randrange(13)==0:
            stroke(draw,[(x,y),(x-1,y-2),(x-2,y-2)],'#9aa675')


def roadway(draw, points, width):
    stroke(draw, points, '#a29a70', width+3)
    stroke(draw, points, '#d4bb88', width+1)
    stroke(draw, [(x,y-1) for x,y in points], '#dfc89c', width-1)


def cottage(target):
    image=Image.new('RGBA',(80,64)); draw=ImageDraw.Draw(image)
    # The foundation and threshold share a ground line across construction states.
    ellipse(draw, 41,55,33,6,(67,79,59,70))
    polygon(draw,[(8,47),(46,37),(70,44),(31,58)],'#71796b')
    polygon(draw,[(8,47),(31,54),(70,44),(70,48),(32,60),(8,52)],'#6d7565')
    stroke(draw,[(8,47),(31,55),(70,44)],'#bbaf8c',2)
    if target=='frame':
        for x,y in [(10,47),(30,54),(66,45),(47,38)]:
            stroke(draw,[(x,y),(x,y-18)],'#76573c',3)
            stroke(draw,[(x-1,y-1),(x-1,y-18)],'#bd945e')
        for beam in [[(10,29),(47,20),(66,27),(30,36),(10,29)],
                     [(10,47),(30,36)],[(31,53),(66,27)],
                     [(10,29),(18,17),(30,36)],[(28,25),(36,13),(48,32)],
                     [(47,20),(55,9),(66,27)],[(18,17),(55,9)]]:
            stroke(draw,beam,'#745a42',3)
            stroke(draw,[(x,y-1) for x,y in beam],'#cfa56c')
        for y in [53,55,57]:
            stroke(draw,[(4,y),(15,y-3)],'#7a6345',3)
            stroke(draw,[(4,y-1),(15,y-4)],'#d2b07c')
        return image
    polygon(draw,[(8,33),(19,20),(31,38),(31,54),(8,46)],'#c6af7d')
    polygon(draw,[(31,38),(67,30),(67,46),(31,55)],'#ead6a8')
    polygon(draw,[(31,38),(67,29),(67,33),(31,43)],'#bfa77b')
    for x,y in [(10,34),(19,37),(29,39),(44,36),(64,31)]:
        stroke(draw,[(x,y),(x,y+13)],'#765b43',2)
    stroke(draw,[(9,44),(30,51),(67,42)],'#917447')
    polygon(draw,[(46,39),(55,37),(55,48),(46,51)],'#66533f')
    polygon(draw,[(48,40),(54,38),(54,47),(48,49)],'#987147')
    stroke(draw,[(51,39),(51,48)],'#604c37')
    draw.point((53,44),'#e8c484')
    polygon(draw,[(34,42),(41,40),(41,46),(34,48)],'#426563')
    stroke(draw,[(37,41),(37,47)],'#c39662')
    stroke(draw,[(34,45),(41,43)],'#c39662')
    polygon(draw,[(13,37),(19,39),(19,44),(13,42)],'#5f6050')
    stroke(draw,[(15,38),(15,43)],'#ab8d62')
    # Long tiled roof, swept ridge and slightly lifted eaves.
    polygon(draw,[(2,31),(8,28),(17,15),(55,6),(60,13),(73,24),(78,23),
                  (75,28),(29,41),(22,38),(19,28),(9,33),(4,33)],'#604b43')
    polygon(draw,[(3,30),(10,26),(17,15),(21,17),(18,25),(10,30),(5,32)],'#96713f')
    polygon(draw,[(19,16),(55,7),(61,18),(71,25),(28,37)],'#a95639')
    polygon(draw,[(19,16),(55,7),(58,12),(23,22)],'#c7824e')
    for i in range(17):
        x,y=20+i*2,16-round(i*0.49)
        stroke(draw,[(x,y),(x+3,y+7),(x+7,y+13),(x+10,y+17)],'#8f5038')
        if i%2==0:
            stroke(draw,[(x+1,y),(x+4,y+6)],'#dfa165')
    for dx,dy in [(3,6),(6,11),(9,16)]:
        stroke(draw,[(19+dx,16+dy),(55+dx,7+dy)],'#b97448')
    stroke(draw,[(2,30),(5,31),(11,29),(18,21),(23,33),(28,39),(72,27),(77,24)],'#645346',2)
    stroke(draw,[(25,34),(29,36),(73,24),(77,23)],'#d7ab73')
    stroke(draw,[(14,14),(17,15),(54,6),(57,3)],'#604f42',2)
    stroke(draw,[(17,14),(55,5)],'#dda66b')
    # Lantern and two worn flagstones at the front door.
    stroke(draw,[(58,34),(58,38)],'#65563d')
    ellipse(draw,58,40,2,3,'#a74730')
    stroke(draw,[(58,38),(58,41)],'#eb9863')
    stroke(draw,[(58,43),(58,44)],'#c78b4c')
    polygon(draw,[(45,51),(55,48),(59,50),(49,54)],'#b3ac91')
    polygon(draw,[(49,54),(59,51),(62,53),(52,57)],'#c1b899')
    if target=='preview':
        alpha=image.getchannel('A').point(lambda a: 255 if a>100 else 0)
        outline=alpha.filter(ImageFilter.MaxFilter(3))
        ghost=Image.new('RGBA',image.size,'#fce8a6')
        ghost.putalpha(outline.point(lambda a:a*210//255))
        fill=Image.new('RGBA',image.size,(226,204,138,92))
        ghost.paste(fill,(0,0),alpha)
        draw=ImageDraw.Draw(ghost)
        for edge in [[(18,15),(55,6)],[(19,16),(29,38),(74,26)],[(29,39),(29,54)],
                     [(8,47),(30,55),(68,45)]]:
            stroke(draw,edge,(255,237,181,230))
        return ghost
    return image


def river_boat(draw, x, y, size, sail=False):
    def pts(points):
        return [(x+dx*size,y+dy*size) for dx,dy in points]
    stroke(draw,pts([(-14,1),(-5,2),(9,1),(15,-1)]),'#8ab1a1')
    polygon(draw,pts([(-10,-2),(-6,0),(7,-1),(11,-4),(8,1),(-5,3),(-9,1)]),'#745e45')
    stroke(draw,pts([(-9,-1),(-5,0),(7,-1),(10,-3)]),'#c3a374')
    if sail:
        stroke(draw,pts([(2,0),(1,-17)]),'#897858')
        polygon(draw,pts([(0,-15),(-7,-9),(-7,-4),(1,-5)]),'#e6d5ad')
        stroke(draw,pts([(-7,-8),(0,-10)]),'#cabb94')
    else:
        polygon(draw,pts([(-5,-1),(-4,-5),(1,-6),(4,-2)]),'#9e8661')
        stroke(draw,pts([(-5,-2),(-3,-5),(1,-5)]),'#d6bb8a')


def bridge(draw, x1, y1, x2, y2, width):
    # Timber crossing viewed from above. The walkable deck meets both banks.
    corners=[(x1-width,y1),(x2-width,y2),(x2+width,y2),(x1+width,y1)]
    polygon(draw,[(x+2,y+3) for x,y in corners],'#668c80')
    polygon(draw,corners,'#ab8a5c')
    steps=15
    for i in range(steps+1):
        t=i/steps
        x,y=x1+(x2-x1)*t,y1+(y2-y1)*t
        stroke(draw,[(x-width,y),(x+width,y-2)],'#d9ba87')
        if i%4==0 or i==steps:
            for side in (-width,width):
                stroke(draw,[(x+side,y),(x+side,y-5)],'#745d43',2)
                draw.point((round(x+side),round(y-6)),'#e6cd95')
    for side in (-width,width):
        stroke(draw,[(x1+side,y1-4),(x2+side,y2-4)],'#8b714f')


def landscape():
    rng=Random(27031)
    screen=Image.new('RGB',(W,H),'#eddcae')
    draw=ImageDraw.Draw(screen)
    for y,color in [(8,'#f3e2b9'),(21,'#f5e5c1'),(34,'#eadfb9')]:
        draw.rectangle((0,y,W,H),fill=color)
    ellipse(draw,365,18,10,10,'#fff0cb')
    for x,y,size in [(54,10,0.6),(90,18,0.38),(228,8,0.75),(399,17,0.37)]:
        cloud(draw,x,y,size)
    # Three independent ridge silhouettes provide aerial perspective.
    for base,phase,scale,fill,light in [(37,-1.8,19,'#c8d1b5','#d9d9b5'),
                                         (45,-0.2,19,'#a9c0aa','#c1cbb0'),
                                         (53,2.9,18,'#93ae96','#afbd99')]:
        profile=[(x,ridge(x,base,phase,scale)) for x in range(-2,W+4,3)]
        polygon(draw,[*profile,(W,H),(0,H)],fill)
        for x in range(0,W,4):
            top=ridge(x,base,phase,scale)
            if ridge(x+2,base,phase,scale)<top and rng.random()<0.65:
                stroke(draw,[(x,top+2),(x-3,top+4),(x-4,top+6)],light)
    for x in range(-4,W+5,3):
        y=ridge(x,63,0.8,12)
        sz=rng.uniform(0.3,0.65)
        pine(draw,x,y,sz,'#86a58c','#96ac8b','#9fb495')
    # Distant rice terraces and village follow the opposite bank.
    shoreline=[(x,north_bank(x)) for x in range(W+1)]
    polygon(draw,[(-2,90),*[(x,ridge(x,67,1,10)) for x in range(-2,W+5,4)],
                   (W,H),(0,H)],'#a9b487')
    for off,col in [(13,'#b4b98b'),(8,'#c6be8c'),(5,'#9fa984')]:
        stroke(draw,[(x,north_bank(x)-off) for x in range(0,W+2,3)],col,2)
    for x in range(2,W,12):
        y=north_bank(x)-rng.randrange(5,12)
        if x%53<32:
            tree(draw,x,y,rng.uniform(0.25,0.48),
                 ('#91a180','#849b80','#99ad89','#abb891'),x+3)
    for x,sz in [(27,0.44),(35,0.5),(93,0.34),(148,0.44),(160,0.62),(172,0.4),
                 (192,0.44),(242,0.35),(311,0.38),(334,0.34),(416,0.39),(432,0.44)]:
        distant_roof(draw,x,north_bank(x)-4,sz)
    # The nearer bank has a warm mud edge and a reflected cool seam.
    polygon(draw,[*shoreline,(W,H),(0,H)],'#8ab6ab')
    stroke(draw,shoreline,'#8d9e84',2)
    for x in range(W):
        y=north_bank(x)
        if (x//4)%3:
            stroke(draw,[(x,y+2),(x,y+3+(x%9==0))],'#80a89a')
    for _ in range(1750):
        x=rng.randrange(W)
        y=rng.uniform(north_bank(x)+3,south_bank(x)-2)
        shade=rng.choice(('#a3c3ae','#91b9ac','#a1bfaa','#82b0a6','#7fa99e','#c0cdb0'))
        stroke(draw,[(x,y),(x+rng.randrange(2,10),y)],shade)
    river_boat(draw,203,100,0.86,True)
    river_boat(draw,294,74,0.6)
    meadow(draw,rng)
    near=[(x,south_bank(x)) for x in range(W+1)]
    stroke(draw,[(x,y+2) for x,y in near],'#c7bd8c',4)
    stroke(draw,near,'#ded0a3',2)
    # A continuous footpath joins the three home sites without painting UI into the map.
    road=[(-8,231),(24,223),(55,217),(81,201),(109,191),(133,188),
          (160,181),(192,182),(222,178),(252,166),(278,161),(306,163),
          (341,176),(369,184),(401,181),(439,167),(484,160)]
    roadway(draw,road,7)
    roadway(draw,[(83,201),(72,185),(65,167),(61,south_bank(60)+1)],4)
    roadway(draw,[(306,164),(311,184),(325,201),(346,216),(360,242),(368,270)],3)
    # Worked rice paddies in the foreground, clearly separate from buildable ground.
    paddies=[[(4,246),(33,227),(64,232),(32,255)],[(36,255),(66,232),(95,235),(66,262)],
             [(71,264),(99,236),(125,241),(101,269)],[(104,270),(129,242),(159,247),(136,273)]]
    for i,field in enumerate(paddies):
        polygon(draw,field,'#828e68')
        cx=sum(x for x,y in field)/4
        cy=sum(y for x,y in field)/4
        inner=[(cx+(x-cx)*0.92,cy+(y-cy)*0.85) for x,y in field]
        polygon(draw,inner,('#a3ad79','#aab67d','#a2b08b','#aeb484')[i])
        a,b,c,d=inner
        for j in range(1,10):
            f=j/10
            start=(a[0]+(d[0]-a[0])*f, a[1]+(d[1]-a[1])*f)
            end=(b[0]+(c[0]-b[0])*f, b[1]+(c[1]-b[1])*f)
            stroke(draw,[start,end],('#d0c98b','#d7cb90','#bed1ad','#c5bf88')[i])
    # Small marks on the road keep the world readable while the camera is still.
    for _ in range(150):
        a=rng.randrange(len(road)-1)
        t=rng.random()
        x=(1-t)*road[a][0]+t*road[a+1][0]
        y=(1-t)*road[a][1]+t*road[a+1][1]+rng.uniform(-2,2)
        stroke(draw,[(x,y),(x+rng.uniform(1,3.5),y)],rng.choice(('#c1ae81','#eddbad','#cfb98c')))
    bridge(draw,61,south_bank(61)+3,48,north_bank(48)-1,4)
    # Low stones and reeds trace the shore in short, irregular groups.
    for x in [3,9,30,35,82,85,102,139,143,156,186,199,222,251,275,285,322,351,403,410,454,463]:
        y=south_bank(x)
        for _ in range(rng.randint(2,6)):
            off=rng.randint(-4,4); ht=rng.randint(2,7)
            stroke(draw,[(x+off,y+2),(x+off-1,y-ht+2)],rng.choice(('#929d71','#a3a777','#b7a474')))
        if x%3==0:
            ellipse(draw,x+3,y,3,2,'#96a18b')
            stroke(draw,[(x+1,y-1),(x+4,y-1)],'#c7c5a1')
    tree_palette=('#9aa079','#536e62','#738a6a','#9da879')
    autumn=('#a4a17a','#877b52','#ad995f','#ceb475')
    # Foreground framing leaves the house footprints clear.
    trees=[(9,168,1.0),(18,174,0.74),(32,173,0.6),(87,157,0.52),
           (179,146,0.52),(187,149,0.76),(198,148,0.48),(231,125,0.48),
           (312,126,0.68),(322,128,0.6),(413,137,0.66),(423,141,0.84),
           (465,152,1.15),(480,164,1.15),(16,244,1.22),(-1,251,1.6),
           (183,244,1.05),(195,247,1.28),(209,250,0.85),(410,237,1.15),
           (423,243,1.42),(438,246,1.0),(464,260,1.6),(484,276,2.5)]
    for i,(x,y,sz) in enumerate(trees):
        tree(draw,x,y,sz,autumn if i%5==1 else tree_palette,300+i*31)
    for x,y,sz in [(6,177,1.2),(23,172,0.72),(180,148,0.72),(313,130,0.95),
                   (430,141,0.8),(442,145,0.63),(9,248,1.25),(200,249,1.2),
                   (416,241,1.48),(472,265,1.7)]:
        pine(draw,x,y,sz,'#526b5e','#798965','#9aa174')
    # Weathered sign by the bridge and boundary posts along the road.
    for x,y in [(60,171),(79,197),(166,178),(279,157),(391,184)]:
        stroke(draw,[(x,y),(x,y-5)],'#7e7052',2)
        draw.point((x-1,y-5),'#d5bf89')
    polygon(draw,[(56,163),(67,161),(67,165),(56,167)],'#957651')
    stroke(draw,[(56,163),(66,161)],'#c9aa78')
    return screen


def resident():
    image=Image.new('RGBA',(12,20))
    draw=ImageDraw.Draw(image)
    ellipse(draw,6,18,5,1,(72,76,62,86))
    for pts,color in [
        ([(3,15),(6,15),(5,18),(3,18)],'#504d43'),
        ([(7,14),(9,15),(9,17),(7,17)],'#655343'),
        ([(2,11),(4,8),(7,8),(9,11),(9,15),(6,16),(2,15)],'#49756b'),
        ([(2,10),(4,8),(6,9),(4,14),(2,14)],'#8da783'),
        ([(7,8),(9,9),(10,12),(9,13),(7,11)],'#c2976a'),
        ([(4,5),(8,5),(8,8),(6,9),(4,8)],'#c79367'),
        ([(0,6),(2,4),(5,2),(7,1),(9,3),(11,5),(8,7),(2,7)],'#766244'),
        ([(1,5),(5,2),(7,1),(10,4),(7,5),(3,6)],'#d7b577')]:
        polygon(draw,pts,color)
    draw.point((7,6),'#584d3e')
    stroke(draw,[(5,11),(4,13)],'#d3b881')
    return image


if __name__ == '__main__':
    landscape().save(HERE/'village.png', optimize=True)
    for state in ('preview','frame','ready'):
        cottage(state).save(HERE/f'house-{state}.png', optimize=True)
    resident().save(HERE/'resident.png', optimize=True)
