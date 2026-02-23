from django.db import migrations, models


def forwards(apps, schema_editor):
    Product = apps.get_model("App", "Product")
    ProductCategory = apps.get_model("App", "ProductCategory")

    code_to_name = {
        "brake-parts": "Brake Parts",
        "filters": "Filters",
        "suspension": "Suspension",
        "engine": "Engine Parts",
        "electrical": "Electrical",
    }

    for code, name in code_to_name.items():
        Product.objects.filter(category=code).update(category=name)

    for category_name in Product.objects.values_list("category", flat=True).distinct():
        if category_name:
            ProductCategory.objects.get_or_create(name=category_name)


def backwards(apps, schema_editor):
    Product = apps.get_model("App", "Product")

    name_to_code = {
        "Brake Parts": "brake-parts",
        "Filters": "filters",
        "Suspension": "suspension",
        "Engine Parts": "engine",
        "Electrical": "electrical",
    }

    for name, code in name_to_code.items():
        Product.objects.filter(category=name).update(category=code)


class Migration(migrations.Migration):

    dependencies = [
        ("App", "0009_productcategory"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="category",
            field=models.CharField(db_index=True, max_length=80),
        ),
        migrations.RunPython(forwards, backwards),
    ]
