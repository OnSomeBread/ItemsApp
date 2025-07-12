from api.models import Task, Maps, Objective

# example task
# some objectives have unique entries and are handled dynamically meaning they wont have their own subclass since there are many of them
"""
{
    'id': '657315ddab5a49b71f098853', 
    'name': 'First in Line', 
    'objectives': 
    [
        {'id': '65732ac3c67dcd96adffa3c7', 'type': 'visit', 'description': 'Locate the Emercom station on Ground Zero', 'maps': [{'normalizedName': 'ground-zero'}, {'normalizedName': 'ground-zero-21'}]}, 
        {'id': '65817bf31404f3565aef9fec', 'type': 'giveItem', 'description': 'Hand over any found in raid medicine items', 'maps': [], 'count': 3, 'foundInRaid': True, 'item': {'name': 'Augmentin antibiotic pills', 'shortName': 'Augmentin'}, 'items': [{'name': 'Augmentin antibiotic pills', 'shortName': 'Augmentin'}, {'name': 'Golden Star balm', 'shortName': 'GoldenStar'}, {'name': 'Ibuprofen painkillers', 'shortName': 'Ibuprofen'}, {'name': 'Morphine injector', 'shortName': 'Morphine'}, {'name': 'Analgin painkillers', 'shortName': 'Analgin'}, {'name': 'Vaseline balm', 'shortName': 'Vaseline'}, {'name': 'Grizzly medical kit', 'shortName': 'Grizzly'}, {'name': 'AFAK tactical individual first aid kit', 'shortName': 'AFAK'}, {'name': 'Car first aid kit', 'shortName': 'Car'}, {'name': 'IFAK individual first aid kit', 'shortName': 'IFAK'}, {'name': 'AI-2 medkit', 'shortName': 'AI-2'}, {'name': 'Salewa first aid kit', 'shortName': 'Salewa'}, {'name': 'Aseptic bandage', 'shortName': 'Bandage'}, {'name': 'Army bandage', 'shortName': 'Bandage'}, {'name': 'CMS surgical kit', 'shortName': 'CMS'}, {'name': 'Aluminum splint', 'shortName': 'Alu splint'}, {'name': 'CAT hemostatic tourniquet', 'shortName': 'CAT'}, {'name': 'Esmarch tourniquet', 'shortName': 'Esmarch'}, {'name': 'CALOK-B hemostatic applicator', 'shortName': 'CALOK-B'}, {'name': 'Immobilizing splint', 'shortName': 'Splint'}, {'name': 'Surv12 field surgical kit', 'shortName': 'Surv12'}, {'name': '3-(b-TG) stimulant injector', 'shortName': '3-(b-TG)'}, {'name': 'AHF1-M stimulant injector', 'shortName': 'AHF1-M'}, {'name': 'Adrenaline injector', 'shortName': 'Adrenaline'}, {'name': 'L1 (Norepinephrine) injector', 'shortName': 'L1'}, {'name': 'M.U.L.E. stimulant injector', 'shortName': 'M.U.L.E.'}, {'name': 'Meldonin injector', 'shortName': 'Meldonin'}, {'name': 'Obdolbos cocktail injector', 'shortName': 'Obdolbos'}, {'name': 'Obdolbos 2 cocktail injector', 'shortName': 'Dolbos 2'}, {'name': 'P22 (Product 22) stimulant injector', 'shortName': 'P22'}, {'name': 'PNB (Product 16) stimulant injector', 'shortName': 'PNB'}, {'name': 'Perfotoran (Blue Blood) stimulant injector', 'shortName': 'Perfotoran'}, {'name': 'Propital regenerative stimulant injector', 'shortName': 'Propital'}, {'name': 'SJ12 TGLabs combat stimulant injector', 'shortName': 'SJ12'}, {'name': 'SJ1 TGLabs combat stimulant injector', 'shortName': 'SJ1'}, {'name': 'SJ6 TGLabs combat stimulant injector', 'shortName': 'SJ6'}, {'name': 'SJ9 TGLabs combat stimulant injector', 'shortName': 'SJ9'}, {'name': 'Trimadol stimulant injector', 'shortName': 'Trimadol'}, {'name': 'Zagustin hemostatic drug injector', 'shortName': 'Zagustin'}, {'name': 'eTG-change regenerative stimulant injector', 'shortName': 'eTG-c'}, {'name': 'xTG-12 antidote injector', 'shortName': 'xTG-12'}, {'name': 'Portable defibrillator', 'shortName': 'Defib'}, {'name': 'LEDX Skin Transilluminator', 'shortName': 'LEDX'}, {'name': 'Aquapeps water purification tablets', 'shortName': 'Aquapeps'}, {'name': 'Medical bloodset', 'shortName': 'Bloodset'}, {'name': 'Ophthalmoscope', 'shortName': 'OScope'}, {'name': 'Bottle of hydrogen peroxide', 'shortName': 'H2O2'}, {'name': 'Bottle of saline solution', 'shortName': 'NaCl'}, {'name': 'Pile of meds', 'shortName': 'Meds'}, {'name': 'Disposable syringe', 'shortName': 'Syringe'}, {'name': 'Bottle of OLOLO Multivitamins', 'shortName': 'Vitamins'}, {'name': 'Medical tools', 'shortName': 'MedTools'}]}
    ]
}
"""

def upsert_tasks(result):
    # create a maps cache
    existing_maps = {m.normalized_name: m for m in Maps.objects.all()}

    # grab only the new maps and add them to ItemTypes model
    new_maps = set(m['normalizedName'] for line in result for obj in line['objectives'] for m in obj['maps']) - existing_maps.keys()
    Maps.objects.bulk_create([Maps(normalized_name=m) for m in new_maps])

    # create dict to grab only the maps we need as a cache
    existing_maps.update({m.normalized_name: m for m in Maps.objects.filter(normalized_name__in=new_maps)})

    for task in result:
        task['_id'] = task.pop('id')
        objectives = task.pop('objectives')

        task, _ = Task.objects.update_or_create(_id=task['_id'], defaults=task)

        for obj in objectives:
            maps = [existing_maps[m['normalizedName']] for m in obj.pop('maps')]
            desc = obj.pop('description')
            obj_type = obj.pop('type')
            obj_id = obj.pop('id')

            out_obj, _ = Objective.objects.update_or_create(_id=obj_id, objective_type=obj_type, description=desc, task=task, objective_data=objectives)
            out_obj.maps.set(maps)



